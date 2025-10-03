import { addToSchedule } from '@/lib/schedule'
import { addToGeneral } from '@/lib/general'
import { addToOrder } from '@/lib/order'
import { updateProductQuantities } from '@/lib/product'
import { calcCartTotals } from '@/lib/cart'
import { sendTransactionReceipt } from '@/lib/email/receipt'
import { Transaction, Membership, Customer } from '@/models'
import { Types } from 'mongoose'
import Stripe from 'stripe'
import { removeKeys } from '@/lib/utils'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

/**
 * Checks if cart contains any membership products
 * @param {Object} cart - The cart object
 * @returns {boolean} - True if cart has membership products
 */
function hasMembershipProducts(cart) {
  return cart.products.some(product => product.type === 'membership')
}

/**
 * Creates Stripe subscriptions for membership products and corresponding membership records
 * @param {Object} params - Parameters
 * @param {Object} params.cart - Cart data
 * @param {Object} params.employee - Employee data
 * @param {Object} params.processedCustomers - Array of processed customers with Stripe IDs
 * @param {Object} params.transaction - Transaction object (for membership record creation)
 * @returns {Object} - Object containing subscriptions and membership records
 */
export async function createMembershipSubscriptions({ cart, employee, processedCustomers, transaction }) {
  const subscriptions = []
  const membershipRecords = []
  const org = employee.org
  
  // Validate processed customers are present
  if (!processedCustomers || processedCustomers.length === 0) {
    throw new Error('Processed customers are required for membership subscriptions')
  }
  
  for (const { customer, product, variation, price, stripeCustomerId } of processedCustomers) {
    // For new membership structure, extract billing info from price object
    // Price object should have period info like "1 month" or "12 months"
    let interval = 'month'
    let intervalCount = 1
    
    // If we have a variation (legacy), use it
    if (variation) {
      interval = mapUnitToStripeInterval(variation.unit)
      intervalCount = parseInt(variation.name) || 1
      
      // Handle fortnight: 2 weeks
      if (variation.unit === 'fortnight') {
        intervalCount = intervalCount * 2
      }
    } else {
      // New structure: parse period from price name (e.g. "Adult - Monthly")
      // Default to monthly if not specified
      interval = 'month'
      intervalCount = 1
    }
    
    // Check if product already has a Stripe product ID for this price
    let stripeProductId = price.stripeProductId
    let stripePriceId = price.stripePriceId
    
    console.log('🔍 Checking Stripe IDs for product:', product.name)
    console.log('   Price object:', JSON.stringify(price, null, 2))
    console.log('   Existing stripeProductId:', stripeProductId)
    console.log('   Existing stripePriceId:', stripePriceId)
    
    if (!stripeProductId) {
      // Check if we already created a Stripe product for this product
      const existingProducts = await stripe.products.list({
        limit: 100
      }, {
        stripeAccount: org.stripeAccountId
      })
      
      const existingProduct = existingProducts.data.find(p => 
        p.metadata.productId === product._id.toString()
      )
      
      if (existingProduct) {
        stripeProductId = existingProduct.id
        console.log('♻️ Reusing existing Stripe product:', stripeProductId)
      } else {
        // Create new Stripe product
        console.log('🆕 Creating new Stripe product for:', product.name)
        const stripeProduct = await stripe.products.create({
          name: product.name,
          description: product.desc || `${product.name} membership`,
          metadata: {
            productId: product._id.toString(),
            orgId: org._id.toString()
          }
        }, {
          stripeAccount: org.stripeAccountId
        })
        stripeProductId = stripeProduct.id
        console.log('   Created Stripe product:', stripeProductId)
      }
    }
    
    if (!stripePriceId) {
      // Check for existing price
      const existingPrices = await stripe.prices.list({
        product: stripeProductId,
        limit: 100
      }, {
        stripeAccount: org.stripeAccountId
      })
      
      const priceAmount = Math.round(parseFloat(price.value) * 100)
      const existingPrice = existingPrices.data.find(p => 
        p.unit_amount === priceAmount &&
        p.recurring?.interval === interval &&
        p.recurring?.interval_count === intervalCount
      )
      
      if (existingPrice) {
        stripePriceId = existingPrice.id
        console.log('♻️ Reusing existing Stripe price:', stripePriceId)
      } else {
        // Create Stripe price for subscription
        const stripePrice = await stripe.prices.create({
          unit_amount: priceAmount, // Convert to cents
          currency: 'aud',
          recurring: {
            interval,
            interval_count: intervalCount
          },
          product: stripeProductId,
          metadata: {
            priceId: price._id ? price._id.toString() : 'custom',
            priceName: price.name
          }
        }, {
          stripeAccount: org.stripeAccountId
        })
        stripePriceId = stripePrice.id
      }
      
      // Update the product with Stripe IDs by matching price properties
      if (product._id) {
        console.log('📝 Attempting to save Stripe IDs to product:', product._id)
        const { Product } = await import('@/models')
        const dbProduct = await Product.findById(product._id)
        console.log('   Found product in DB:', !!dbProduct)
        
        if (dbProduct && dbProduct.prices) {
          console.log('   Product prices:', JSON.stringify(dbProduct.prices, null, 2))
          
          // Find the matching price index
          const priceIndex = dbProduct.prices.findIndex(p => 
            p.name === price.name && 
            p.value === price.value &&
            p.minor === price.minor
          )
          
          console.log('   Matching price index:', priceIndex)
          console.log('   Looking for:', { name: price.name, value: price.value, minor: price.minor })
          
          if (priceIndex !== -1) {
            // Update the specific price with Stripe IDs
            dbProduct.prices[priceIndex].stripeProductId = stripeProductId
            dbProduct.prices[priceIndex].stripePriceId = stripePriceId
            const savedProduct = await dbProduct.save()
            console.log('✅ Saved Stripe IDs to product price')
            console.log('   Updated price:', JSON.stringify(savedProduct.prices[priceIndex], null, 2))
          } else {
            console.log('❌ Could not find matching price in product')
          }
        } else {
          console.log('❌ Product not found or has no prices')
        }
      } else {
        console.log('⚠️ No product._id provided')
      }
    }
    
    // In dev mode, create real Stripe subscriptions with test clocks for testing
    // In production, create manual subscription records
    const isDev = process.env.NEXT_PUBLIC_IS_DEV === 'true';
    let subscription;
    let testClockId = null;

    if (isDev) {
      console.log('🧪 Dev mode: Creating Stripe subscription with test clock');

      try {
        // Create a test clock for this subscription
        const testClock = await stripe.testHelpers.testClocks.create({
          frozen_time: Math.floor(Date.now() / 1000),
          name: `${customer.name} - ${product.name} (${new Date().toISOString()})`
        }, {
          stripeAccount: org.stripeAccountId
        });

        testClockId = testClock.id;
        console.log(`⏰ Created test clock: ${testClockId}`);

        // Create a test customer linked to the test clock
        const testCustomer = await stripe.customers.create({
          email: customer.email,
          name: customer.name,
          test_clock: testClockId,
          metadata: {
            originalCustomerId: customer._id.toString(),
            testClock: testClockId
          }
        }, {
          stripeAccount: org.stripeAccountId
        });

        console.log(`👤 Created test customer: ${testCustomer.id}`);

        // Create the subscription with the test customer
        subscription = await stripe.subscriptions.create({
          customer: testCustomer.id,
          items: [{
            price: stripePriceId
          }],
          collection_method: 'charge_automatically',
          metadata: {
            productId: product._id.toString(),
            customerId: customer._id.toString(),
            orgId: org._id.toString(),
            locationId: employee.selectedLocationId.toString(),
            billingMethod: 'stripe_auto',
            testClockId: testClockId,
            priceName: price.name,
            productName: product.name,
            billingFrequency: price.billingFrequency || 'monthly',
            hasLimitedBilling: price.billingMax ? 'true' : 'false',
            billingMax: price.billingMax ? price.billingMax.toString() : '0',
            billingCount: '1' // First payment already made
          }
        }, {
          stripeAccount: org.stripeAccountId
        });

        console.log(`✅ Created Stripe subscription: ${subscription.id} with test clock`);
      } catch (error) {
        console.error('❌ Failed to create test subscription:', error);
        throw error;
      }
    } else {
      // Production: create manual subscription
      subscription = {
        id: `manual_sub_${Date.now()}_${customer._id}`,
        status: 'active',
        customer: stripeCustomerId,
        items: {
          data: [{
            price: {
              id: stripePriceId,
              product: stripeProductId
            }
          }]
        },
        metadata: {
          productId: product._id.toString(),
          customerId: customer._id.toString(),
          orgId: org._id.toString(),
          locationId: employee.selectedLocationId.toString(),
          billingMethod: 'terminal_manual'
        },
        collection_method: 'send_invoice',
        days_until_due: 30
      };
    }
    
    // Create membership record in database
    try {
      const membershipRecord = await createMembershipRecord({
        customer,
        transaction,
        product,
        variation,
        price,
        subscription,
        employee,
        testClockId
      })
      
      membershipRecords.push(membershipRecord)
      console.log(`✅ Created membership record for ${customer.name} - ${product.name}`)
    } catch (error) {
      console.error(`❌ Failed to create membership record for ${customer.name}:`, error)
      // Don't throw error to prevent subscription rollback, but log it
    }
    
    subscriptions.push({
      ...subscription,
      productDetails: {
        productId: product._id.toString(),
        customerId: customer._id.toString(),
        name: product.name,
        variation: variation ? variation.name : '1',
        unit: variation ? variation.unit : 'month',
        price: price.value
      }
    })
  }
  
  return {
    subscriptions,
    membershipRecords
  }
}

/**
 * Maps duration unit to Stripe subscription interval
 * @param {string} unit - Duration unit (month, year, etc.)
 * @returns {string} - Stripe interval (month, year, day, week)
 */
function mapUnitToStripeInterval(unit) {
  const mapping = {
    'month': 'month',
    'year': 'year',
    'week': 'week',
    'day': 'day',
    'fortnight': 'week' // Will use interval_count: 2
  }
  return mapping[unit] || 'month'
}

/**
 * Calculates the next billing date based on variation unit and count
 * @param {Date} startDate - Subscription start date
 * @param {string} unit - Unit (month, year, week, day, fortnight)
 * @param {number} count - Number of units
 * @returns {Date} - Next billing date
 */
function calculateNextBillingDate(startDate, unit, count = 1) {
  const date = new Date(startDate)
  
  switch (unit) {
    case 'day':
      date.setDate(date.getDate() + count)
      break
    case 'week':
      date.setDate(date.getDate() + (count * 7))
      break
    case 'fortnight':
      date.setDate(date.getDate() + (count * 14))
      break
    case 'month':
      date.setMonth(date.getMonth() + count)
      break
    case 'year':
      date.setFullYear(date.getFullYear() + count)
      break
    default:
      // Default to monthly
      date.setMonth(date.getMonth() + count)
  }
  
  return date
}

/**
 * Creates a membership record in the database
 * @param {Object} params - Parameters
 * @param {Object} params.customer - Customer object
 * @param {Object} params.transaction - Transaction object
 * @param {Object} params.product - Product object
 * @param {Object} params.variation - Variation object
 * @param {Object} params.price - Price object
 * @param {Object} params.subscription - Stripe subscription object
 * @param {Object} params.employee - Employee object
 * @returns {Object} - Created membership record
 */
export async function createMembershipRecord({
  customer,
  transaction,
  product,
  variation,
  price,
  subscription,
  employee,
  parentCustomer = null,  // Add parent customer for dependent memberships
  testClockId = null  // Test clock ID for dev mode subscriptions
}) {
  const subscriptionStartDate = new Date()

  // Handle both old (variation) and new (no variation) structures
  let unit = 'month'
  let count = 1
  let variationValue = '1' // Default variation value for display

  if (variation) {
    // Legacy structure with variation
    count = parseInt(variation.name) || 1
    unit = variation.unit
    variationValue = variation.name
  } else if (price) {
    // New structure - parse from price billing frequency
    const billingFrequency = price.billingFrequency || 'monthly'

    if (billingFrequency === 'weekly') {
      unit = 'week'
      count = 1
      variationValue = '1'
    } else if (billingFrequency === 'fortnightly') {
      unit = 'fortnight'
      count = 1
      variationValue = '1'
    } else if (billingFrequency === 'monthly') {
      unit = 'month'
      count = 1
      variationValue = '1'
    } else if (billingFrequency === 'yearly') {
      unit = 'year'
      count = 1
      variationValue = '1'
    }
  }

  const nextBillingDate = calculateNextBillingDate(subscriptionStartDate, unit, count)

  // Calculate subscription end date if billingMax is set
  let subscriptionEndDate = null
  if (price?.billingMax && price.billingMax > 0) {
    // billingMax is the total number of billing cycles
    // Calculate the end date: start date + (billingMax * billing period)
    subscriptionEndDate = calculateNextBillingDate(subscriptionStartDate, unit, count * price.billingMax)
    console.log(`📅 Membership ends after ${price.billingMax} billing cycles: ${subscriptionEndDate.toISOString()}`)
  }
  
  // Determine the actual customer ID and dependent info
  let customerId;
  let dependentInfo = null;
  
  if (parentCustomer) {
    // This is a dependent membership - store parent's ID and dependent info
    customerId = new Types.ObjectId(parentCustomer._id);
    dependentInfo = {
      name: customer.name,
      dob: customer.dob,
      gender: customer.gender,
      _id: customer._id  // This is the dependent's subdocument ID
    };
  } else if (customer._id) {
    // Regular customer membership
    customerId = new Types.ObjectId(customer._id);
  } else {
    // This might be a dependent passed without a parent - shouldn't happen but handle it
    throw new Error('Cannot create membership: customer ID is missing');
  }
  
  const membershipData = {
    // Core References (transaction has all the product/price details)
    customer: customerId,  // Always the parent/account holder
    transaction: transaction._id,
    product: new Types.ObjectId(product._id),
    org: employee.org._id,
    location: employee.selectedLocationId,

    // Subscription Details (for display purposes)
    variation: variationValue, // e.g., "1" for display
    unit: unit, // e.g., "month", "year" for display
    priceName: price?.name || 'Standard', // e.g., "Youth", "Adult"
    amount: price?.value || 0, // Subscription amount per billing cycle

    // Dependent Information (if this is for a minor)
    dependent: dependentInfo,  // Store dependent details if applicable

    // Stripe Integration
    // Use subscription.customer (which is the test customer in dev mode) instead of customer.stripeCustomerId
    stripeCustomerId: subscription.customer || parentCustomer?.stripeCustomerId || customer.stripeCustomerId,
    stripeSubscriptionId: subscription.id, // This will be manual_sub_* for terminal payments
    stripeProductId: subscription.items.data[0]?.price?.product,
    stripePriceId: subscription.items.data[0]?.price?.id,
    isManualSubscription: subscription.id.startsWith('manual_sub_'), // Track if this is manual
    ...(testClockId && { testClockId }), // Store test clock ID for dev mode testing

    // Subscription Lifecycle (needed for billing tracking)
    subscriptionStartDate,
    nextBillingDate,
    ...(subscriptionEndDate && { subscriptionEndDate }), // Only include if set

    // Status Management
    status: 'active',
    billingMethod: 'stripe_auto', // All subscriptions now use automatic billing
    lastBillingDate: subscriptionStartDate
  }
  
  console.log('📝 Creating membership record:', {
    customer: customer.name,
    product: product.name,
    variation: variation ? `${variation.name} ${variation.unit}` : 'Monthly',
    price: `${price.name} - $${price.value}`,
    stripeSubscriptionId: subscription.id,
    nextBillingDate: nextBillingDate.toISOString()
  })
  
  return await Membership.create(membershipData)
}

/**
 * Extracts the first customer from cart products (for transactions with multiple customers)
 * @param {Object} cart - The cart object
 * @returns {Object|null} - First customer found or null
 */
export function getFirstCustomer({ cart }) {
  for (const product of cart.products || []) {
    for (const variation of product.variations || []) {
      for (const price of variation.prices || []) {
        for (const customerEntry of price.customers || []) {
          if (customerEntry?.customer?._id) {
            return customerEntry.customer;
          }
        }
      }
    }
  }
  return null;
}

/**
 * Determines the customer for the transaction based on cart data
 * @param {Object} cart - The cart object
 * @returns {Types.ObjectId|undefined} - Customer ObjectId or undefined
 */
export function resolveTransactionCustomer({ cart }) {
  const first = getFirstCustomer({ cart });
  return first?._id
    ? new Types.ObjectId(first._id)
    : cart.customer?._id
      ? new Types.ObjectId(cart.customer._id)
      : undefined;
}

/**
 * Prepares cart data for transaction storage
 * Removes unnecessary fields like thumbnails, timestamps, etc.
 * @param {Object} cart - The cart object
 * @returns {Object} - Cleaned cart object
 */
export function prepareCartForTransaction(cart) {
  // Custom list of keys to remove - keeping bump, variations, and modifiers
  const keysToRemove = [
    'timesCalc',
    'desc',
    'createdAt',
    'updatedAt',
    'thumbnail',
    '__v',
    'deleted',
    'instructions',
    'modGroupsData',
    'waiver',
    'folder',
    'schedule',
    'storeHours'
  ];
  
  // Use removeKeys with custom keys that preserve order-related fields
  return removeKeys(cart, keysToRemove);
}

/**
 * Creates a cash transaction
 * @param {Object} params - Parameters
 * @param {Object} params.cart - Cart data
 * @param {Object} params.employee - Employee data
 * @param {number} params.received - Amount received
 * @param {number} params.change - Change given
 * @returns {Object} - Created transaction
 */
export async function createCashTransaction({ cart, employee, received, change }) {
  const cleanCart = prepareCartForTransaction(cart);
  const txnCustomer = resolveTransactionCustomer({ cart: cleanCart });
  
  // Extract adjustments using new unified structure
  let adjustments = {
    discounts: {
      items: [],
      total: 0
    },
    surcharges: {
      items: [],
      total: 0
    },
    credits: {
      customerId: null,
      amount: 0
    }
  };
  
  // Copy adjustments from cart if they exist
  if (cleanCart.adjustments) {
    // Deep copy the adjustments structure
    adjustments = {
      discounts: {
        items: cleanCart.adjustments.discounts?.items?.map(item => ({
          id: typeof item.id === 'string' ? Types.ObjectId.createFromHexString(item.id) : item.id,
          name: item.name,
          amount: item.amount,
          custom: item.custom || false // Preserve the custom flag
        })) || [],
        total: cleanCart.adjustments.discounts?.total || 0
      },
      surcharges: {
        items: cleanCart.adjustments.surcharges?.items?.map(item => ({
          id: typeof item.id === 'string' ? Types.ObjectId.createFromHexString(item.id) : item.id,
          name: item.name,
          amount: item.amount
        })) || [],
        total: cleanCart.adjustments.surcharges?.total || 0
      },
      credits: cleanCart.adjustments.credits || { customerId: null, amount: 0 }
    };
  }
  
  // Calculate totals - pass null for discount since it's already applied in adjustments
  const totals = calcCartTotals(cleanCart.products, null);
  
  // Use the adjusted total and tax from cart if available (includes credit adjustments), otherwise use calculated values
  const finalTotal = cleanCart.total !== undefined ? cleanCart.total : totals.total;
  const finalTax = cleanCart.tax !== undefined ? cleanCart.tax : totals.tax;

  return await Transaction.create({
    org: employee.org._id,
    total: finalTotal,
    tax: finalTax,
    subtotal: totals.subtotal,
    adjustments: adjustments,  // New unified structure
    employee: employee._id,
    customer: txnCustomer,
    location: employee.selectedLocationId,
    paymentMethod: "cash",
    cart: cleanCart,
    cash: {
      currency: "AUD",
      received: parseFloat(received).toFixed(2),
      change: parseFloat(change).toFixed(2),
    },
    status: "succeeded"
  });
}

/**
 * Creates a stripe transaction (for payment intent)
 * @param {Object} params - Parameters
 * @param {Object} params.cart - Cart data
 * @param {Object} params.employee - Employee data
 * @param {Object} params.customer - Customer data from request
 * @param {Object} params.paymentIntent - Stripe payment intent
 * @returns {Object} - Created transaction
 */
export async function createStripeTransaction({ cart, employee, customer, paymentIntent, isSubscription, processedCustomers, isSetupPhase, isFirstPeriodCharge }) {
  const cleanCart = prepareCartForTransaction(cart);
  const txnCustomer = resolveTransactionCustomer({ cart: cleanCart });
  
  // Extract adjustments using new unified structure
  let adjustments = {
    discounts: {
      items: [],
      total: 0
    },
    surcharges: {
      items: [],
      total: 0
    },
    credits: {
      customerId: null,
      amount: 0
    }
  };
  
  // Copy adjustments from cart if they exist
  if (cleanCart.adjustments) {
    // Deep copy the adjustments structure
    adjustments = {
      discounts: {
        items: cleanCart.adjustments.discounts?.items?.map(item => ({
          id: typeof item.id === 'string' ? Types.ObjectId.createFromHexString(item.id) : item.id,
          name: item.name,
          amount: item.amount,
          custom: item.custom || false // Preserve the custom flag
        })) || [],
        total: cleanCart.adjustments.discounts?.total || 0
      },
      surcharges: {
        items: cleanCart.adjustments.surcharges?.items?.map(item => ({
          id: typeof item.id === 'string' ? Types.ObjectId.createFromHexString(item.id) : item.id,
          name: item.name,
          amount: item.amount
        })) || [],
        total: cleanCart.adjustments.surcharges?.total || 0
      },
      credits: cleanCart.adjustments.credits || { customerId: null, amount: 0 }
    };
  }
  
  // Calculate totals - pass null for discount since it's already applied in adjustments
  const totals = calcCartTotals(cleanCart.products, null);
  
  // Use the adjusted total and tax from cart if available (includes credit adjustments), otherwise use calculated values
  const finalTotal = cleanCart.total !== undefined ? cleanCart.total : totals.total;
  const finalTax = cleanCart.tax !== undefined ? cleanCart.tax : totals.tax;
  
  // Create the transaction first (needed for membership records)
  const transaction = await Transaction.create({
    org: employee.org._id,
    stripePaymentIntentId: paymentIntent?.id,
    total: finalTotal,
    tax: finalTax,
    subtotal: totals.subtotal,
    adjustments: adjustments,  // New unified structure
    paymentMethod: "card",
    location: employee.selectedLocationId,
    customer: txnCustomer || (customer?._id ? Types.ObjectId.createFromHexString(customer._id) : undefined),
    employee: employee._id,
    cart: cleanCart,
    stripe: {
      paymentIntent
    },
    status: paymentIntent.status
  });

  // Check if this is a membership subscription
  const isMembershipTransaction = isSubscription || hasMembershipProducts(cleanCart);
  let subscriptions = [];
  let membershipRecords = [];
  
  // Create subscriptions for membership products (skip only during setup phase)
  // We DO want to create memberships on first period charge
  if (isMembershipTransaction && !isSetupPhase) {
    try {
      let subscriptionResult;
      
      if (processedCustomers && processedCustomers.length > 0) {
        // Use new multi-customer approach
        subscriptionResult = await createMembershipSubscriptions({ 
          cart: cleanCart, 
          employee, 
          processedCustomers,
          transaction
        });
      } else if (customer) {
        // Fallback to single customer approach for backward compatibility
        subscriptionResult = await createMembershipSubscriptions({ 
          cart: cleanCart, 
          employee, 
          processedCustomers: [{
            customer,
            product: cleanCart.products.find(p => p.type === 'membership'),
            variation: cleanCart.products.find(p => p.type === 'membership')?.item?.variation,
            price: cleanCart.products.find(p => p.type === 'membership')?.item?.price,
            stripeCustomerId: customer.stripeCustomerId
          }],
          transaction
        });
      } else {
        throw new Error('No customer data provided for membership subscription');
      }
      
      subscriptions = subscriptionResult.subscriptions;
      membershipRecords = subscriptionResult.membershipRecords;
      
      console.log(`✅ Created ${subscriptions.length} Stripe subscriptions and ${membershipRecords.length} membership records`);
    } catch (error) {
      console.error('Failed to create membership subscriptions:', error);
      throw new Error('Failed to create membership subscriptions');
    }
  }
  
  // Update transaction with subscription data and final status
  const updatedTransaction = await Transaction.findByIdAndUpdate(transaction._id, {
    stripe: {
      paymentIntent,
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        status: sub.status,
        productDetails: sub.productDetails
      }))
    },
    status: isMembershipTransaction ? 
      (isSetupPhase ? 'setup_pending' : 
       isFirstPeriodCharge ? 'first_period_paid' : 
       'subscription_active') : 
      paymentIntent.status
  }, { new: true });
  
  return updatedTransaction;
}

/**
 * Handles all post-transaction success operations
 * @param {Object} params - The parameters object
 * @param {Object} params.transaction - The created transaction object
 * @param {Object} params.cart - The cart data
 * @param {Object} params.employee - The employee object
 */
export async function handleTransactionSuccess({ transaction, cart, employee }) {
  try {
    // Add products to schedules (for class bookings)
    await addToSchedule({ transaction, cart, employee });
    
    // Add products to general entries
    await addToGeneral({ transaction, cart, employee });
    
    // Add products to orders (for retail items)
    await addToOrder({ transaction, cart, employee });
    
    // Update product quantities/stock levels
    await updateProductQuantities(cart.products);
    
    // Record discount usage if applicable
    // Check adjustments structure for discount information
    if (transaction.adjustments?.discounts?.items?.length > 0 && transaction.customer) {
      for (const discount of transaction.adjustments.discounts.items) {
        await recordDiscountUsage(transaction.customer, discount.id, discount.amount, discount.custom);
        console.log(`✅ Recorded discount usage for customer ${transaction.customer}, discount ${discount.name}${discount.custom ? ' (custom)' : ''}`);
      }
    } else if (transaction.adjustments?.discounts?.total > 0) {
      console.log('⚠️ Discount applied but missing customer ID');
    }
    
    // Deduct credits if used
    if (transaction.adjustments?.credits?.amount > 0 && transaction.adjustments?.credits?.customerId) {
      const creditAmount = transaction.adjustments.credits.amount;
      const customerId = transaction.adjustments.credits.customerId;
      
      console.log('💳 Processing credit deduction:', {
        creditAmount,
        customerId,
        customerIdType: typeof customerId
      });
      
      // Update customer credits balance
      const customer = await Customer.findById(customerId);
      if (customer) {
        console.log('👤 Found customer:', customer.name, 'Current balance:', customer.credits?.balance);
        
        // Add debit entry
        if (!customer.credits) {
          customer.credits = { balance: 0, credits: [], debits: [] };
        }
        
        customer.credits.debits.push({
          date: new Date(),
          employee: employee._id,
          transaction: transaction._id,
          amount: creditAmount,
          note: `Payment for transaction #${transaction._id}`
        });
        
        // Update balance
        customer.credits.balance = Math.max(0, (customer.credits.balance || 0) - creditAmount);
        
        await customer.save();
        console.log(`✅ Deducted $${creditAmount.toFixed(2)} in credits from customer ${customer.name}, new balance: $${customer.credits.balance.toFixed(2)}`);
      } else {
        console.log('❌ Customer not found with ID:', customerId);
      }
    } else {
      console.log('💳 No credits to deduct:', {
        hasCredits: transaction.adjustments?.credits,
        amount: transaction.adjustments?.credits?.amount,
        customerId: transaction.adjustments?.credits?.customerId
      });
    }
    
    // Send email receipt if customer has email (non-blocking)
    sendEmailReceipt({ transaction, cart, employee }).catch(error => {
      console.error('❌ Background email send failed:', error);
    });
    
    console.log(`✅ Post-transaction success operations completed for transaction: ${transaction._id}`);
  } catch (error) {
    console.error('❌ Error in post-transaction success operations:', error);
    // Don't throw error to prevent transaction rollback
    // Log the error for debugging but continue
  }
}

/**
 * Sends email receipt to customer if email is available
 * @param {Object} params - The parameters object
 * @param {Object} params.transaction - The transaction object
 * @param {Object} params.cart - The cart data
 * @param {Object} params.employee - The employee object
 */
async function sendEmailReceipt({ transaction, cart, employee }) {
  try {
    // Check if this transaction contains only shop products
    const hasOnlyShopProducts = cart.products.every(product => product.type === 'shop');

    // If it's only shop products, check if auto receipt is enabled
    if (hasOnlyShopProducts) {
      // Get the org settings to check autoReceiptShop
      const org = employee.org;
      if (!org.autoReceiptShop) {
        console.log(`ℹ️ Auto receipt for shop disabled, skipping email for transaction ${transaction._id}`);
        return;
      }
    }

    // Determine the customer email
    let customerEmail = null;
    
    // Check if transaction has a customer with email
    if (transaction.customer?.email) {
      customerEmail = transaction.customer.email;
    } else if (cart.customer?.email) {
      customerEmail = cart.customer.email;
    } else {
      // Check if any product has customers with emails
      for (const product of cart.products || []) {
        for (const variation of product.variations || []) {
          for (const price of variation.prices || []) {
            for (const customerEntry of price.customers || []) {
              if (customerEntry?.customer?.email) {
                customerEmail = customerEntry.customer.email;
                break;
              }
            }
            if (customerEmail) break;
          }
          if (customerEmail) break;
        }
        if (customerEmail) break;
      }
    }
    
    // If we found an email, send the receipt
    if (customerEmail) {
      // Populate transaction with necessary references for email
      const populatedTransaction = await Transaction.findById(transaction._id)
        .populate('customer', 'name email phone memberId')
        .populate('employee', 'name')
        .populate('org', 'name email phone addressLine suburb state postcode logo')
        .populate('location', 'name')
        .lean();
      
      const result = await sendTransactionReceipt({
        transaction: populatedTransaction,
        recipientEmail: customerEmail,
        org: populatedTransaction.org
      });
      
      if (result.success) {
        console.log(`📧 Receipt email sent to ${customerEmail} for transaction ${transaction._id}`);
        console.log(`   Preview URL: ${result.previewUrl}`);
      } else {
        console.error(`❌ Failed to send receipt email to ${customerEmail}:`, result.error);
      }
    } else {
      console.log(`ℹ️ No customer email found for transaction ${transaction._id}, skipping receipt email`);
    }
  } catch (error) {
    console.error('❌ Error sending email receipt:', error);
    // Don't throw - email sending should not break the transaction flow
  }
}

/**
 * Record discount usage for a customer after successful payment
 * @param {String} customerId - Customer ID
 * @param {String} discountId - Discount ID
 * @param {Number} amount - Discount amount applied
 * @param {Boolean} custom - Whether this is a custom discount
 */
async function recordDiscountUsage(customerId, discountId, amount, custom = false) {
  try {
    // Ensure discountId is an ObjectId
    const discountObjectId = typeof discountId === 'string' 
      ? Types.ObjectId.createFromHexString(discountId) 
      : discountId;
    
    await Customer.findByIdAndUpdate(
      customerId,
      {
        $push: {
          'adjustments.discounts': {
            discount: discountObjectId,
            amount: amount,
            custom: custom, // Add the custom flag
            usedAt: new Date()
          }
        }
      },
      { upsert: false }
    );
    console.log(`✅ Recorded discount usage: Customer ${customerId} used discount ${discountId} for $${amount}`);
  } catch (error) {
    console.error('❌ Error recording discount usage:', error);
    // Don't throw - this shouldn't break the transaction flow
  }
} 