import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { Transaction } from '@/models';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET(req) {
  await connectDB();
  const { employee } = await getEmployee();
  const org = employee.org;
  
  // Get payment intent ID from URL params
  const { searchParams } = new URL(req.url);
  const paymentIntentId = searchParams.get('paymentIntentId');
  
  if (!paymentIntentId) {
    return NextResponse.json({ error: 'paymentIntentId required' }, { status: 400 });
  }

  try {
    console.log('🔍 Checking payment intent status:', paymentIntentId);
    
    // Get payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      stripeAccount: org.stripeAccountId
    });

    console.log('📊 Payment intent status:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      capture_method: paymentIntent.capture_method
    });

    // Check if ready for capture
    const readyForCapture = paymentIntent.status === 'requires_capture';
    const needsCapture = paymentIntent.capture_method === 'manual' && readyForCapture;

    return NextResponse.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      capture_method: paymentIntent.capture_method,
      readyForCapture,
      needsCapture,
      charges: paymentIntent.charges?.data || [],
      last_payment_error: paymentIntent.last_payment_error
    });
    
  } catch (error) {
    console.error('❌ Error checking payment status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Also support POST for account status (existing functionality)
export async function POST() {
  await connectDB();
  const { employee } = await getEmployee();
  const org = employee.org;
  const account = await stripe.accounts.retrieve(org.stripeAccountId);

  return Response.json({
    charges_enabled: account.charges_enabled,
    details_submitted: account.details_submitted,
  });
}