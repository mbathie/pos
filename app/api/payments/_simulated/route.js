import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {

  // tmr_GESEsAYkIxiYvJ


    const reader = await stripe.terminal.readers.create({
      location: 'tml_GESDwAsU1vpZdD',
      registration_code: 'simulated-wpe',
    });

    console.log(reader)

    return NextResponse.json(reader);
}
