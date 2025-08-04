import { NextResponse } from "next/server";
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Transaction, Customer } from "@/models";
import { createMembershipSubscriptions } from '@/lib/payments/success'

export async function POST(req, { params }) {
  await connectDB()

  const { cart, setupIntentId, transactionId } = await req.json()
  const { employee } = await getEmployee()
  const org = employee.org

  try {
    // Retrieve the confirmed setup intent
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
      stripeAccount: org.stripeAccountId
    });

    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json({
        error: 'Setup intent not confirmed'
      }, { status: 400 });
    }

    // Get the payment method that was collected
    const paymentMethod = setupIntent.payment_method;
    if (!paymentMethod) {
      return NextResponse.json({
        error: 'No payment method found on setup intent'
      }, { status: 400 });
    }

    // Get the existing transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return NextResponse.json({
        error: 'Transaction not found'
      }, { status: 404 });
    }

    // Extract processed customers from the transaction
    const processedCustomers = [];
    
    // Rebuild processedCustomers from cart data, but fetch updated customer data from DB
    for (const product of cart.products) {
      if (product.type !== 'membership') continue;
      
      for (const variation of product.variations || []) {
        for (const price of variation.prices || []) {
          for (const customerSlot of price.customers || []) {
            if (customerSlot.customer?._id) {
              // Fetch updated customer data from database to get stripeCustomerId
              const updatedCustomer = await Customer.findById(customerSlot.customer._id);
              if (!updatedCustomer || !updatedCustomer.stripeCustomerId) {
                throw new Error(`Customer ${customerSlot.customer._id} not found or missing Stripe ID`);
              }
              
              processedCustomers.push({
                customer: updatedCustomer,
                product,
                variation,
                price,
                stripeCustomerId: updatedCustomer.stripeCustomerId
              });
            }
          }
        }
      }
    }

    // Attach the payment method to all customers who will get subscriptions
    for (const processedCustomer of processedCustomers) {
      await stripe.paymentMethods.attach(paymentMethod, {
        customer: processedCustomer.stripeCustomerId,
      }, {
        stripeAccount: org.stripeAccountId
      });

      // Set as default payment method for subscriptions
      await stripe.customers.update(processedCustomer.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethod,
        },
      }, {
        stripeAccount: org.stripeAccountId
      });
    }

    // Now create the subscriptions with customers that have payment methods
    const subscriptions = await createMembershipSubscriptions({ 
      cart, 
      employee, 
      processedCustomers 
    });

    // Update the transaction with the completed subscriptions
    await Transaction.findByIdAndUpdate(transactionId, {
      'stripe.subscriptions': subscriptions.map(sub => ({
        id: sub.id,
        status: sub.status,
        productDetails: sub.productDetails
      })),
      status: 'subscription_active'
    });

    return NextResponse.json({
      success: true,
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        status: sub.status,
        productDetails: sub.productDetails
      }))
    }, { status: 200 });

  } catch (error) {
    console.error('Subscription completion failed:', error);
    return NextResponse.json({
      error: error.message || 'Failed to complete subscription'
    }, { status: 500 });
  }
}