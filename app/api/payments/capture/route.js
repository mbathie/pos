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
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, {
      stripeAccount: org.stripeAccountId
    });

    // Update the transaction with the captured payment intent
    const updatedTransaction = await Transaction.findByIdAndUpdate(transactionId, {
      'stripe.paymentIntent': paymentIntent,
      status: paymentIntent.status
    }, { new: true });

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
