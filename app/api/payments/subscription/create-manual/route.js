import { NextResponse } from "next/server";
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Transaction, Customer, Product } from "@/models";
import { createMembershipRecord } from '@/lib/payments/success';
import mongoose from 'mongoose';

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

  const { cart, paymentIntentId, transactionId } = await req.json()
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
    
    for (const product of cart.products) {
      if (product.type !== 'membership') continue;
      
      for (const variation of product.variations || []) {
        for (const price of variation.prices || []) {
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

              // Calculate the total amount including tax (same as what was paid initially)
              const itemSubtotal = parseFloat(price.value);
              const itemTax = itemSubtotal * 0.10; // 10% tax rate
              const itemTotal = itemSubtotal + itemTax;
              
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
                  unit_amount: Math.round(itemTotal * 100), // Include tax in recurring price
                  currency: 'aud',
                  recurring: {
                    interval: variation.unit === 'fortnight' ? 'week' : (variation.unit || 'month'),
                    interval_count: variation.unit === 'fortnight' ? parseInt(variation.name) * 2 : parseInt(variation.name) || 1
                  },
                  product: stripeProduct.id,
                  metadata: {
                    priceId: price._id ? price._id.toString() : 'custom',
                    priceName: price.name,
                    isManualBilling: 'true',
                    includesTax: 'true'
                  }
                }, {
                  stripeAccount: org.stripeAccountId
                });
                
                // Cart data doesn't have _id fields, we need to match by name/value
                console.log('🔍 Cart variation data:', {
                  variationName: variation.name,
                  variationUnit: variation.unit,
                  priceName: price.name,
                  priceValue: price.value
                });
                
                // Update database using name/value matching instead of _id
                const updateResult = await Product.findOneAndUpdate(
                  { 
                    '_id': product._id
                  },
                  { 
                    '$set': { 
                      'variations.$[varElem].prices.$[priceElem].stripePriceId': stripePrice.id 
                    }
                  },
                  { 
                    arrayFilters: [
                      { 
                        'varElem.name': variation.name,
                        'varElem.unit': variation.unit
                      },
                      { 
                        'priceElem.name': price.name,
                        'priceElem.value': parseFloat(price.value)
                      }
                    ],
                    new: true
                  }
                );
                
                if (updateResult) {
                  console.log('✅ Successfully updated price ID in database');
                } else {
                  console.log('❌ Failed to update price ID in database');
                }
                
                console.log('✅ Created new Stripe price and saved ID:', stripePrice.id);
              }

              // Create a subscription but with manual collection
              const subscription = await stripe.subscriptions.create({
                customer: updatedCustomer.stripeCustomerId,
                items: [{
                  price: stripePrice.id,
                  quantity: 1
                }],
                collection_method: 'send_invoice', // Manual invoicing
                days_until_due: 7, // 7 days to pay invoice
                billing_cycle_anchor: calculateNextBillingDate(variation.unit, parseInt(variation.name) || 1),
                metadata: {
                  productId: product._id.toString(),
                  customerId: updatedCustomer._id.toString(),
                  orgId: org._id.toString(),
                  locationId: employee.selectedLocationId.toString(),
                  firstPeriodPaid: 'true',
                  paymentIntentId: paymentIntentId
                }
              }, {
                stripeAccount: org.stripeAccountId
              });

              // Create membership record in database using centralized logic
              try {
                const membershipRecord = await createMembershipRecord({
                  customer: updatedCustomer,
                  transaction,
                  product,
                  variation,
                  price,
                  subscription,
                  employee
                });
                
                console.log(`✅ Created membership record for ${updatedCustomer.name} - ${product.name}`);
              } catch (error) {
                console.error(`❌ Failed to create membership record for ${updatedCustomer.name}:`, error);
                // Don't throw error to prevent subscription rollback, but log it
              }

              subscriptions.push({
                id: subscription.id,
                status: subscription.status,
                productDetails: {
                  productId: product._id.toString(),
                  customerId: updatedCustomer._id.toString(),
                  name: product.name,
                  variation: variation.name,
                  unit: variation.unit,
                  price: price.value,
                  billingType: 'manual_terminal'
                }
              });
            }
          }
        }
      }
    }

    // Update the transaction with subscription details
    await Transaction.findByIdAndUpdate(transactionId, {
      'stripe.subscriptions': subscriptions,
      status: 'subscription_active'
    });

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