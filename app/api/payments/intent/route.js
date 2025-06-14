import { NextResponse } from "next/server";
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { connectDB } from "@/lib/mongoose";
import { Transaction } from "@/models";

import { getEmployee } from "@/lib/auth";
import { calcCartTotals } from "@/lib/cart"
import { Types } from "mongoose";

export async function POST(req, { params }) {
  await connectDB()

  const { cart, customer } = await req.json()
  const { employee } = await getEmployee()
  const org = employee.org

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

  const transaction = await Transaction.create({
    org: org._id,
    paymentIntentId: paymentIntent.id,
    total: totals.total,
    tax: totals.tax,
    subtotal: totals.subtotal,
    paymentMethod: "stripe",
    locationId: employee.selectedLocationId,
    customerId: customer?._id ? Types.ObjectId.createFromHexString(customer._id) : undefined,
    cart,
    stripe: {
      paymentIntent
    },
    status: paymentIntent.status
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    id: paymentIntent.id,
    transactionId: transaction._id
  }, { status: 200 });  
}
