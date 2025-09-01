import { NextResponse } from "next/server";
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Customer } from "@/models";
import { createStripeTransaction } from '@/lib/payments/success'
import { calcCartTotals } from "@/lib/cart";

export async function POST(req, { params }) {
  await connectDB()

  const { cart } = await req.json()
  const { employee } = await getEmployee()
  const org = employee.org

  // Verify cart contains membership products
  const membershipProducts = cart.products.filter(product => product.type === 'membership');
  if (membershipProducts.length === 0) {
    return NextResponse.json({
      error: 'No membership products found in cart'
    }, { status: 400 });
  }

  try {
    // Collect all customers from membership products and ensure they have Stripe IDs
    const customersToProcess = [];
    
    for (const product of membershipProducts) {
      // Memberships now have prices directly on the product (like classes)
      for (const price of product.prices || []) {
        for (const customerSlot of price.customers || []) {
          if (customerSlot.customer?._id) {
            customersToProcess.push({
              customer: customerSlot.customer,
              product,
              variation: null, // No longer using variations
              price
            });
          }
        }
      }
    }

    if (customersToProcess.length === 0) {
      return NextResponse.json({
        error: 'No customers connected to membership products'
      }, { status: 400 });
    }

    // For terminal payments, we need to create a setup intent first to collect payment method
    // We'll create customers but not subscriptions yet - that happens after payment method collection

    // Create or retrieve Stripe customers for each customer
    const processedCustomers = [];
    for (const { customer, product, variation, price } of customersToProcess) {
      // First, fetch the latest customer data from DB to check for existing Stripe ID
      const dbCustomer = await Customer.findById(customer._id);
      let stripeCustomerId = dbCustomer.stripeCustomerId;
      
      // Create Stripe customer if doesn't exist
      if (!stripeCustomerId) {
        // Check if a Stripe customer already exists with this email
        const existingCustomers = await stripe.customers.list({
          email: customer.email,
          limit: 1
        }, {
          stripeAccount: org.stripeAccountId
        });
        
        if (existingCustomers.data.length > 0) {
          stripeCustomerId = existingCustomers.data[0].id;
        } else {
          const stripeCustomer = await stripe.customers.create({
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
            metadata: {
              customerId: customer._id.toString(),
              orgId: org._id.toString()
            }
          }, {
            stripeAccount: org.stripeAccountId
          });
          stripeCustomerId = stripeCustomer.id;
        }

        // Update customer record with Stripe ID
        await Customer.findByIdAndUpdate(customer._id, {
          stripeCustomerId: stripeCustomerId
        });
      }

      processedCustomers.push({
        customerId: customer._id,
        stripeCustomerId,
        customer: { ...customer, stripeCustomerId },
        product,
        variation,
        price
      });
    }

    // For terminal subscriptions, we need to charge the first period immediately
    // and set up manual invoicing for future periods (terminal payments can't be saved)
    
    // Calculate total amount for first period
    const totals = calcCartTotals(cart.products);
    const amountInCents = Math.round(totals.total * 100);
    
    // Create a payment intent for the first period charge (auto-capture for memberships)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'aud',
      payment_method_types: ['card_present'],
      capture_method: 'automatic', // Auto-capture for membership first period
      metadata: {
        orgId: org._id.toString(),
        locationId: employee.selectedLocationId.toString(),
        customersCount: processedCustomers.length.toString(),
        isFirstPeriodCharge: 'true'
      }
    }, {
      stripeAccount: org.stripeAccountId
    });

    // Create transaction record for the first period payment
    // Pass isSetupPhase: true to prevent membership creation here (will be done in create-manual route)
    const transaction = await createStripeTransaction({ 
      cart, 
      employee, 
      customer: processedCustomers[0].customer,
      paymentIntent,
      isSubscription: true,
      processedCustomers,
      isSetupPhase: true  // Prevent duplicate membership creation
    });

    return NextResponse.json({
      isFirstPeriodCharge: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      transactionId: transaction._id,
      processedCustomers: processedCustomers.map(pc => ({
        customerId: pc.customerId,
        stripeCustomerId: pc.stripeCustomerId
      }))
    }, { status: 200 });

  } catch (error) {
    console.error('Subscription creation failed:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create subscription'
    }, { status: 500 });
  }
}