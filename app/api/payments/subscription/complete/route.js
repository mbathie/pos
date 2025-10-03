import { NextResponse } from "next/server";
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Transaction, Customer, Product } from "@/models";
import { createMembershipRecord, handleTransactionSuccess } from '@/lib/payments/success';

/**
 * Calculate the next billing date based on subscription period
 */
function calculateNextBillingDate(unit, count) {
  const now = new Date();
  let nextBilling = new Date(now);
  
  switch (unit) {
    case 'day':
      nextBilling.setDate(now.getDate() + count);
      break;
    case 'week':
      nextBilling.setDate(now.getDate() + (count * 7));
      break;
    case 'fortnight':
      nextBilling.setDate(now.getDate() + (count * 14));
      break;
    case 'month':
      nextBilling.setMonth(now.getMonth() + count);
      break;
    case 'year':
      nextBilling.setFullYear(now.getFullYear() + count);
      break;
    default:
      // Default to 1 month if unit is unknown
      nextBilling.setMonth(now.getMonth() + 1);
  }
  
  return Math.floor(nextBilling.getTime() / 1000);
}



export async function POST(req, { params }) {
  await connectDB()

  const { cart, paymentIntentId, transactionId, isSimulation } = await req.json()
  const { employee } = await getEmployee()
  const org = employee.org

  try {
    // Get the transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return NextResponse.json({
        error: 'Transaction not found'
      }, { status: 404 });
    }

    // Create manual subscription records for each customer/membership pair
    const subscriptions = [];
    
    console.log('🔍 Processing cart products for manual subscriptions');
    console.log('Cart products:', JSON.stringify(cart.products.map(p => ({
      name: p.name,
      type: p.type,
      hasVariations: !!p.variations,
      hasPrices: !!p.prices,
      pricesCount: p.prices?.length || 0,
      variationsCount: p.variations?.length || 0
    })), null, 2));
    
    for (const product of cart.products) {
      if (product.type !== 'membership') continue;
      
      // Handle new structure (prices directly on product)
      const pricesArray = product.prices || [];
      
      console.log('📦 Processing membership product:', product.name);
      console.log('  Prices count:', pricesArray.length);
      
      for (const price of pricesArray) {
          console.log('💰 Processing price:', {
            name: price.name,
            value: price.value,
            billingFrequency: price.billingFrequency,
            billingMax: price.billingMax,
            hasBillingMax: !!price.billingMax,
            customers: price.customers?.length || 0
          });

          for (const customerSlot of price.customers || []) {
            if (customerSlot.customer?._id) {
              // Fetch updated customer data from database
              const updatedCustomer = await Customer.findById(customerSlot.customer._id);
              if (!updatedCustomer || !updatedCustomer.stripeCustomerId) {
                throw new Error(`Customer ${customerSlot.customer._id} not found or missing Stripe ID`);
              }

              // Check if product already has a Stripe product ID, if not create one
              let stripeProduct;
              if (product.stripeProductId) {
                // Reuse existing Stripe product
                try {
                  stripeProduct = await stripe.products.retrieve(product.stripeProductId, {
                    stripeAccount: org.stripeAccountId
                  });
                  console.log('✅ Reusing existing Stripe product:', stripeProduct.id);
                } catch (error) {
                  console.log('⚠️ Existing Stripe product not found, creating new one');
                  stripeProduct = null;
                }
              }
              
              if (!stripeProduct) {
                // Create new Stripe product
                stripeProduct = await stripe.products.create({
                  name: product.name,
                  description: `${product.name} membership with terminal billing`,
                  metadata: {
                    productId: product._id.toString(),
                    orgId: org._id.toString(),
                    isManualBilling: 'true'
                  }
                }, {
                  stripeAccount: org.stripeAccountId
                });
                
                // Save the Stripe product ID to our database
                await Product.findByIdAndUpdate(product._id, {
                  stripeProductId: stripeProduct.id
                });
                
                console.log('✅ Created new Stripe product and saved ID:', stripeProduct.id);
              }

              // Use the base price for subscriptions (tax is handled separately)
              const itemSubtotal = parseFloat(price.value);
              
              // For new structure, get billing info from price
              const billingFrequency = price.billingFrequency || 'monthly';
              let interval = 'month';
              let intervalCount = 1;
              
              // Parse billing frequency
              if (billingFrequency === 'weekly') {
                interval = 'week';
                intervalCount = 1;
              } else if (billingFrequency === 'fortnightly') {
                interval = 'week';
                intervalCount = 2;
              } else if (billingFrequency === 'monthly') {
                interval = 'month';
                intervalCount = 1;
              } else if (billingFrequency === 'yearly') {
                interval = 'year';
                intervalCount = 1;
              }
              
              // Check if price already has a Stripe price ID, if not create one
              let stripePrice;
              if (price.stripePriceId) {
                // Reuse existing Stripe price
                try {
                  stripePrice = await stripe.prices.retrieve(price.stripePriceId, {
                    stripeAccount: org.stripeAccountId
                  });
                  console.log('✅ Reusing existing Stripe price:', stripePrice.id);
                } catch (error) {
                  console.log('⚠️ Existing Stripe price not found, creating new one');
                  stripePrice = null;
                }
              }
              
              if (!stripePrice) {
                // Create new Stripe price
                stripePrice = await stripe.prices.create({
                  unit_amount: Math.round(itemSubtotal * 100), // Base price in cents (tax handled separately)
                  currency: 'aud',
                  recurring: {
                    interval: interval,
                    interval_count: intervalCount
                  },
                  product: stripeProduct.id,
                  metadata: {
                    priceId: price._id ? price._id.toString() : 'custom',
                    priceName: price.name,
                    isManualBilling: 'true'
                  }
                }, {
                  stripeAccount: org.stripeAccountId
                });
                
                // Save Stripe IDs to database
                console.log('🔍 Updating product with Stripe IDs');
                console.log('  Product ID:', product._id);
                console.log('  Price to match:', { name: price.name, value: price.value, minor: price.minor });
                
                // Fetch the product from database to update it
                const dbProduct = await Product.findById(product._id);
                if (dbProduct && dbProduct.prices) {
                  const priceIndex = dbProduct.prices.findIndex(p => 
                    p.name === price.name && 
                    p.value === price.value &&
                    p.minor === price.minor
                  );
                  
                  if (priceIndex !== -1) {
                    dbProduct.prices[priceIndex].stripeProductId = stripeProduct.id;
                    dbProduct.prices[priceIndex].stripePriceId = stripePrice.id;
                    await dbProduct.save();
                    console.log('✅ Successfully updated price with Stripe IDs in database');
                  } else {
                    console.log('❌ Could not find matching price in database product');
                  }
                } else {
                  console.log('❌ Product not found in database or has no prices');
                }
                
                console.log('✅ Created new Stripe price:', stripePrice.id);
              }

              // Calculate next billing date based on billing frequency
              let nextBillingUnit = 'month';
              let nextBillingCount = 1;
              if (billingFrequency === 'weekly') {
                nextBillingUnit = 'week';
                nextBillingCount = 1;
              } else if (billingFrequency === 'fortnightly') {
                nextBillingUnit = 'week';
                nextBillingCount = 2;
              } else if (billingFrequency === 'yearly') {
                nextBillingUnit = 'year';
                nextBillingCount = 1;
              }
              
              // Setup payment method for automatic recurring billing
              const isDev = process.env.NEXT_PUBLIC_IS_DEV === 'true';
              let testClockId = null;
              let subscriptionCustomerId = updatedCustomer.stripeCustomerId;

              if (isDev) {
                console.log('🧪 Dev mode: Creating subscription with test clock');

                // Create a test clock for this subscription
                const testClock = await stripe.testHelpers.testClocks.create({
                  frozen_time: Math.floor(Date.now() / 1000),
                  name: `${updatedCustomer.name} - ${product.name} (${new Date().toISOString()})`
                }, {
                  stripeAccount: org.stripeAccountId
                });

                testClockId = testClock.id;
                console.log(`⏰ Created test clock: ${testClockId}`);

                // Create a test customer linked to the test clock
                const testCustomer = await stripe.customers.create({
                  email: updatedCustomer.email,
                  name: updatedCustomer.name,
                  test_clock: testClockId,
                  metadata: {
                    originalCustomerId: updatedCustomer._id.toString(),
                    testClock: testClockId
                  }
                }, {
                  stripeAccount: org.stripeAccountId
                });

                subscriptionCustomerId = testCustomer.id;
                console.log(`👤 Created test customer: ${testCustomer.id}`);

                // Attach a test payment method to the customer
                const paymentMethod = await stripe.paymentMethods.create({
                  type: 'card',
                  card: {
                    token: 'tok_visa' // Stripe test token
                  }
                }, {
                  stripeAccount: org.stripeAccountId
                });

                await stripe.paymentMethods.attach(
                  paymentMethod.id,
                  { customer: testCustomer.id },
                  { stripeAccount: org.stripeAccountId }
                );

                // Set as default payment method
                await stripe.customers.update(
                  testCustomer.id,
                  { invoice_settings: { default_payment_method: paymentMethod.id } },
                  { stripeAccount: org.stripeAccountId }
                );

                console.log(`💳 Attached test payment method: ${paymentMethod.id}`);
              } else {
                // Production: Get payment method from the initial payment intent
                console.log('💳 Production mode: Setting up automatic billing from initial payment');

                try {
                  const paymentIntent = await stripe.paymentIntents.retrieve(
                    paymentIntentId,
                    { stripeAccount: org.stripeAccountId }
                  );

                  if (paymentIntent.payment_method) {
                    // Set the payment method from the initial payment as default
                    await stripe.customers.update(
                      updatedCustomer.stripeCustomerId,
                      {
                        invoice_settings: {
                          default_payment_method: paymentIntent.payment_method
                        }
                      },
                      { stripeAccount: org.stripeAccountId }
                    );

                    console.log(`✅ Set default payment method from initial payment: ${paymentIntent.payment_method}`);
                  } else {
                    console.warn('⚠️ No payment method found on initial payment intent');
                  }
                } catch (error) {
                  console.error('❌ Failed to set default payment method:', error);
                  // Continue anyway - subscription will still be created
                }
              }

              // Prepare subscription creation parameters
              // Use charge_automatically for both dev and production (automatic recurring billing)
              const subscriptionParams = {
                customer: subscriptionCustomerId,
                items: [{
                  price: stripePrice.id,
                  quantity: 1
                }],
                collection_method: 'charge_automatically',
                metadata: {
                  productId: product._id.toString(),
                  customerId: updatedCustomer._id.toString(),
                  orgId: org._id.toString(),
                  locationId: employee.selectedLocationId.toString(),
                  firstPeriodPaid: 'true',
                  paymentIntentId: paymentIntentId,
                  isSimulated: isSimulation ? 'true' : 'false',
                  priceName: price.name,
                  productName: product.name,
                  billingFrequency: billingFrequency,
                  ...(isDev && { testClockId })
                }
              };

              // Add billing cycle limit if billingMax is set
              // Note: billingMax represents the total number of times to charge (including first period)
              console.log('🔍 Checking billingMax:', {
                priceBillingMax: price.billingMax,
                type: typeof price.billingMax,
                isSet: price.billingMax && price.billingMax > 0,
                willSetMetadata: !!(price.billingMax && price.billingMax > 0)
              });

              if (price.billingMax && price.billingMax > 0) {
                console.log(`✅ Setting billingMax metadata: billingMax=${price.billingMax}, billingCount=1`);
                subscriptionParams.metadata.billingMax = price.billingMax.toString();
                subscriptionParams.metadata.billingCount = '1'; // Already charged 1st period
                subscriptionParams.metadata.hasLimitedBilling = 'true';

                // If billingMax is 1, cancel the subscription immediately after this period
                if (price.billingMax === 1) {
                  subscriptionParams.cancel_at_period_end = true;
                  console.log('⚠️ billingMax=1, setting cancel_at_period_end=true');
                }
              } else {
                // Indefinite billing
                console.log('ℹ️ No billingMax set, subscription will be indefinite');
                subscriptionParams.metadata.hasLimitedBilling = 'false';
              }

              console.log('📋 Final subscription metadata:', subscriptionParams.metadata);

              // Create a subscription but with manual collection
              const subscription = await stripe.subscriptions.create(subscriptionParams, {
                stripeAccount: org.stripeAccountId
              });

              // Create membership record here using centralized logic
              try {
                const membershipRecord = await createMembershipRecord({
                  customer: customerSlot.dependent || updatedCustomer, // Use dependent if it exists
                  transaction,
                  product,
                  variation: null, // No variation in new structure
                  price,
                  subscription,
                  employee,
                  parentCustomer: customerSlot.dependent ? updatedCustomer : null, // Pass parent if this is for a dependent
                  testClockId // Pass test clock ID for dev mode
                });
                
                console.log(`✅ Created membership record for ${customerSlot.dependent ? customerSlot.dependent.name : updatedCustomer.name} - ${product.name}`);
              } catch (error) {
                console.error(`❌ Failed to create membership record:`, error);
                // Don't throw error to prevent subscription rollback, but log it
              }

              subscriptions.push({
                id: subscription.id,
                status: subscription.status,
                productDetails: {
                  productId: product._id.toString(),
                  customerId: updatedCustomer._id.toString(),
                  name: product.name,
                  priceName: price.name,
                  billingFrequency: billingFrequency,
                  price: price.value,
                  billingType: 'manual_terminal'
                }
              });
            }
          }
        }
      }

    // Update the transaction with subscription details
    const updatedTransaction = await Transaction.findByIdAndUpdate(transactionId, {
      'stripe.subscriptions': subscriptions,
      status: 'subscription_active'
    }, { new: true })
      .populate('customer', 'name email phone memberId')
      .populate('org', 'name email phone addressLine suburb state postcode logo');

    // Handle post-transaction success operations (only non-membership related)
    // We're not calling handleTransactionSuccess because it would create duplicate membership records
    // Instead, we'll manually call the other necessary functions
    if (updatedTransaction && updatedTransaction.cart) {
      const { addToSchedule } = await import('@/lib/schedule');
      const { addToGeneral } = await import('@/lib/general');
      const { addToOrder } = await import('@/lib/order');
      const { updateProductQuantities } = await import('@/lib/product');
      const { sendTransactionReceipt } = await import('@/lib/email/receipt');
      
      try {
        // Add products to schedules (for class bookings)
        await addToSchedule({ transaction: updatedTransaction, cart: updatedTransaction.cart, employee });
        
        // Add products to general entries
        await addToGeneral({ transaction: updatedTransaction, cart: updatedTransaction.cart, employee });
        
        // Add products to orders (for retail items)
        await addToOrder({ transaction: updatedTransaction, cart: updatedTransaction.cart, employee });
        
        // Update product quantities/stock levels
        await updateProductQuantities(updatedTransaction.cart.products);
        
        // Send email receipt if customer has email
        const customerEmail = updatedTransaction.customer?.email || 
          updatedTransaction.cart?.customer?.email;
          
        if (customerEmail) {
          await sendTransactionReceipt({
            transaction: updatedTransaction,
            recipientEmail: customerEmail,
            org: updatedTransaction.org || employee.org
          });
        }
        
        console.log(`✅ Post-transaction operations completed for transaction: ${updatedTransaction._id}`);
      } catch (error) {
        console.error('❌ Error in post-transaction operations:', error);
        // Don't throw error to prevent transaction rollback
      }
    }

    return NextResponse.json({
      success: true,
      subscriptions: subscriptions
    }, { status: 200 });

  } catch (error) {
    console.error('Manual subscription creation failed:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create manual subscriptions'
    }, { status: 500 });
  }
}