import Stripe from 'stripe';
import { NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req) {
  const buf = await req.arrayBuffer();
  const rawBody = Buffer.from(buf);
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      console.log('💰 PaymentIntent was successful!');
      break;
    case 'payment_intent.payment_failed':
      console.log('❌ PaymentIntent failed.');
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return new NextResponse(null, { status: 200 });
}
