import { NextResponse } from "next/server";
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { Org } from "@/models";

// export async function POST(req, { params }) {

// }


export async function GET(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const org = employee.org;
  // console.log(org)

  const account = await stripe.accounts.create({
    type: 'standard',
    email: org.email,
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

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.DOMAIN}/settings`,
    return_url: `${process.env.DOMAIN}/settings?stripeReturn=1`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ ...accountLink }, { status: 200 });
}
