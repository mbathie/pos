import { NextResponse } from "next/server"
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
import { getEmployee } from "@/lib/auth"
import { connectDB } from "@/lib/mongoose"
import { Org } from "@/models"

export async function GET(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const org = await Org.findById(employee.org._id);

  const accountId = org.stripeAccountId;

  if (!accountId) {
    return NextResponse.json({ error: 'Stripe account not linked.' }, { status: 404 });
  }

  const account = await stripe.accounts.retrieve(accountId);

  return NextResponse.json({ charges_enabled: account.charges_enabled }, { status: 200 });
}
