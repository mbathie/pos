import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getEmployee } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST() {
  try {
    const { employee } = await getEmployee();
    const org = employee.org;

    const connectionToken = await stripe.terminal.connectionTokens.create({}, {
      stripeAccount: org.stripeAccountId
    });

    return NextResponse.json({ secret: connectionToken.secret });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}