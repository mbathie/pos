import { NextResponse } from "next/server";
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { calcCartTotals } from "@/lib/cart";
import { createStripeTransaction } from '@/lib/payments/success'

export async function POST(req, { params }) {
  await connectDB()

  const { cart, customer, isSimulation } = await req.json()
  const { employee } = await getEmployee()
  const org = employee.org

  // Regular one-time payment flow (memberships handled by separate subscription endpoint)
  const totals = calcCartTotals(cart.products);
  const amountInCents = Math.round(totals.total * 100);

  let paymentIntent;

  // Check if this is a simulation in dev mode
  if (isSimulation && process.env.NEXT_PUBLIC_IS_DEV === 'true') {
    // For simulation, create a payment intent that can work in test mode
    // Use card payment method type instead of card_present for easier testing
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'aud',
      payment_method_types: ['card'],
      payment_method: 'pm_card_visa', // Test card that always succeeds
      confirmation_method: 'manual',
      confirm: true, // Automatically confirm with the test card
      capture_method: 'manual', // Manual capture for consistency
      metadata: {
        orgId: org._id.toString(),
        locationId: employee.selectedLocationId.toString(),
        isSimulated: 'true'
      }
    }, {
      stripeAccount: org.stripeAccountId
    });
  } else {
    // Regular payment intent for real terminal payments
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'aud',
      payment_method_types: ['card_present'],
      capture_method: 'manual',
    }, {
      stripeAccount: org.stripeAccountId
    });
  }

  // Create the stripe transaction (cleanup happens in createStripeTransaction)
  const transaction = await createStripeTransaction({ cart, employee, customer, paymentIntent });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    id: paymentIntent.id,
    transactionId: transaction._id
  }, { status: 200 });
}
