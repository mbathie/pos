import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { connectDB } from "@/lib/mongoose";
import { Transaction } from "@/models";
import { getEmployee } from '@/lib/auth';
import { handleTransactionSuccess } from '@/lib/payments/success';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  await connectDB()

  const { employee } = await getEmployee();
  const org = employee.org;

  try {
    const { paymentIntentId, transactionId } = await req.json();
    console.log(paymentIntentId)

    // First retrieve the payment intent to check its status
    let paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      stripeAccount: org.stripeAccountId
    });

    // Only capture if it's in the requires_capture state
    if (paymentIntent.status === 'requires_capture') {
      paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, {
        stripeAccount: org.stripeAccountId
      });
    } else if (paymentIntent.status === 'succeeded') {
      console.log(`✅ PaymentIntent ${paymentIntentId} already captured/succeeded`);
    } else {
      console.log(`⚠️ PaymentIntent ${paymentIntentId} in unexpected state: ${paymentIntent.status}`);
    }

    // Update the transaction with the captured payment intent
    const updatedTransaction = await Transaction.findByIdAndUpdate(transactionId, {
      'stripe.paymentIntent': paymentIntent,
      status: paymentIntent.status
    }, { new: true })
      .populate('customer', 'name email phone memberId');

    // Handle post-transaction success operations if payment succeeded
    if (paymentIntent.status === 'succeeded' && updatedTransaction?.cart) {
      await handleTransactionSuccess({
        transaction: updatedTransaction,
        cart: updatedTransaction.cart,
        employee
      });
    }

    console.log(`✅ PaymentIntent captured: ${paymentIntent.id}`);
    return NextResponse.json(paymentIntent);
  } catch (err) {
    console.error('❌ Error capturing PaymentIntent:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
