import { NextResponse } from "next/server";
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { Org } from "@/models";

export async function GET(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const org = employee.org;

  const account = await stripe.accounts.create({
    type: 'standard',
    // email: org.email,
    business_profile: {
      url: "https://change.me",
      name: org.name,
      product_description: "Fitness and Entertainment"
    },
    metadata: {
      orgId: org._id.toString()
    }
  });

  await Org.findByIdAndUpdate(org._id, {
    stripeAccountId: account.id
  });

  const baseUrl = process.env.STRIPE_HOST || process.env.HOST || process.env.NEXT_PUBLIC_API_BASE_URL;

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${baseUrl}/settings/payments`,
    return_url: `${baseUrl}/settings/payments?stripeReturn=1`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ ...accountLink }, { status: 200 });
}
