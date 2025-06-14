import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST() {
  try {
    const location = await stripe.terminal.locations.create({
      display_name: 'HQ',
      address: {
        line1: '1234 Victoria Street',
        city: 'Melbourne',
        state: 'Victoria',
        country: 'AU',
        postal_code: '3000',
      },
    });

    console.log(location)

    return NextResponse.json(location);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
