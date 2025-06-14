// /api/payments/account-status/route.js
import Stripe from 'stripe';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET() {
  await connectDB();
  const { employee } = await getEmployee();

  const org = employee.org;
  const account = await stripe.accounts.retrieve(org.stripeAccountId);

  return Response.json({
    charges_enabled: account.charges_enabled,
    details_submitted: account.details_submitted,
  });
}