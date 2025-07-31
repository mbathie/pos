import { NextResponse } from "next/server";
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { calcCartTotals } from "@/lib/cart";
import { createStripeTransaction } from '@/lib/payments/success'

export async function POST(req, { params }) {
  await connectDB()

  const { cart, customer } = await req.json()
  const { employee } = await getEmployee()
  const org = employee.org

  // Calculate totals for Stripe payment intent
  const totals = calcCartTotals(cart.products);
  const amountInCents = Math.round(totals.total * 100);
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: 'aud',
    payment_method_types: ['card_present'],
    capture_method: 'manual',
  }, {
    stripeAccount: org.stripeAccountId
  });

  // Create the stripe transaction
  const transaction = await createStripeTransaction({ cart, employee, customer, paymentIntent });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    id: paymentIntent.id,
    transactionId: transaction._id
  }, { status: 200 });  
}
