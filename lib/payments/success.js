import { addToSchedule } from '@/lib/schedule'
import { addToCasual } from '@/lib/casual'
import { addToOrder } from '@/lib/order'
import { updateProductQuantities } from '@/lib/product'
import { calcCartTotals } from '@/lib/cart'
import { sendTransactionReceipt } from '@/lib/email/receipt'
import { Transaction, Membership } from '@/models'
import { Types } from 'mongoose'
import Stripe from 'stripe'

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
    // Convert unit and variation to Stripe interval
    const interval = mapUnitToStripeInterval(variation.unit)
    let intervalCount = parseInt(variation.name) || 1
    
    // Handle fortnight: 2 weeks
    if (variation.unit === 'fortnight') {
      intervalCount = intervalCount * 2
    }
    
    // Create or retrieve Stripe product
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
    
    // Create Stripe price for subscription
    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round(parseFloat(price.value) * 100), // Convert to cents
      currency: 'aud',
      recurring: {
        interval,
        interval_count: intervalCount
      },
      product: stripeProduct.id,
      metadata: {
        priceId: price._id ? price._id.toString() : 'custom',
        priceName: price.name
      }
    }, {
      stripeAccount: org.stripeAccountId
    })
    
    // Create subscription for this specific customer
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{
        price: stripePrice.id,
        quantity: 1 // Each customer gets their own subscription
      }],
      metadata: {
        productId: product._id.toString(),
        customerId: customer._id.toString(),
        orgId: org._id.toString(),
        locationId: employee.selectedLocationId.toString()
      }
    }, {
      stripeAccount: org.stripeAccountId
    })
    
    // Create membership record in database
    try {
      const membershipRecord = await createMembershipRecord({
        customer,
        transaction,
        product,
        variation,
        price,
        subscription,
        employee
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
        variation: variation.name,
        unit: variation.unit,
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
  employee
}) {
  const subscriptionStartDate = new Date()
  const variationCount = parseInt(variation.name) || 1
  const nextBillingDate = calculateNextBillingDate(subscriptionStartDate, variation.unit, variationCount)
  
  const membershipData = {
    // Core References (transaction has all the product/price details)
    customer: new Types.ObjectId(customer._id),
    transaction: transaction._id,
    product: new Types.ObjectId(product._id),
    org: employee.org._id,
    location: employee.selectedLocationId,
    
    // Stripe Integration (needed for subscription management)
    stripeCustomerId: customer.stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    stripeProductId: subscription.items.data[0]?.price?.product,
    stripePriceId: subscription.items.data[0]?.price?.id,
    
    // Subscription Lifecycle (needed for billing tracking)
    subscriptionStartDate,
    nextBillingDate,
    
    // Status Management
    status: 'active',
    billingMethod: 'terminal_manual', // Since we're using manual invoicing
    lastBillingDate: subscriptionStartDate
  }
  
  console.log('📝 Creating membership record:', {
    customer: customer.name,
    product: product.name,
    variation: `${variation.name} ${variation.unit}`,
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
 * Prepares cart data for transaction storage (removes thumbnails, etc.)
 * @param {Object} cart - The cart object
 * @returns {Object} - Cleaned cart object
 */
export function prepareCartForTransaction(cart) {
  return {
    ...cart,
    products: cart.products.map(p => {
      const { thumbnail, ...rest } = p;
      return rest;
    })
  };
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
  const totals = calcCartTotals(cleanCart.products, cleanCart.discount);

  return await Transaction.create({
    org: employee.org._id,
    total: totals.total,
    tax: totals.tax,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount || 0,
    discount: cleanCart.discount?._id || null,
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
  const totals = calcCartTotals(cleanCart.products, cleanCart.discount);
  
  // Create the transaction first (needed for membership records)
  const transaction = await Transaction.create({
    org: employee.org._id,
    paymentIntentId: paymentIntent?.id,
    total: totals.total,
    tax: totals.tax,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount || 0,
    discount: cleanCart.discount?._id || null,
    paymentMethod: "stripe",
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
  
  // Create subscriptions for membership products (only if not in setup phase and not first period charge)
  if (isMembershipTransaction && !isSetupPhase && !isFirstPeriodCharge) {
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
    
    // Add products to casual bookings
    await addToCasual({ transaction, cart, employee });
    
    // Add products to orders (for retail items)
    await addToOrder({ transaction, cart, employee });
    
    // Update product quantities/stock levels
    await updateProductQuantities(cart.products);
    
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
        .populate('org', 'name email phone')
        .populate('location', 'name')
        .lean();
      
      const result = await sendTransactionReceipt({
        transaction: populatedTransaction,
        recipientEmail: customerEmail,
        org: employee.org
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