import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Customer, Membership, Org } from '@/models';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request, { params }) {
  try {
    await connectDB();

    // Authenticate employee
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId, membershipId } = await params;

    // Validate customer and membership
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const membership = await Membership.findById(membershipId)
      .populate('product')
      .populate('location');

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    if (!membership.stripeSubscriptionId) {
      return NextResponse.json({
        error: 'No Stripe subscription found for this membership'
      }, { status: 400 });
    }

    // Get organization
    const org = await Org.findById(employee.org._id);
    if (!org || !org.stripeAccountId) {
      return NextResponse.json({
        error: 'Organization Stripe account not configured'
      }, { status: 400 });
    }

    const stripeAccountId = org.stripeAccountId;

    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      membership.stripeSubscriptionId,
      { stripeAccount: stripeAccountId }
    );

    if (!subscription) {
      return NextResponse.json({
        error: 'Subscription not found in Stripe'
      }, { status: 404 });
    }

    // Find the latest unpaid invoice for this subscription
    const invoices = await stripe.invoices.list({
      subscription: subscription.id,
      status: 'open', // Only get unpaid invoices
      limit: 1
    }, { stripeAccount: stripeAccountId });

    if (!invoices.data || invoices.data.length === 0) {
      return NextResponse.json({
        error: 'No outstanding invoices found for this membership'
      }, { status: 404 });
    }

    const invoice = invoices.data[0];
    const amountDue = invoice.amount_due; // in cents

    console.log('💰 Creating payment intent for Terminal collection:', {
      invoiceId: invoice.id,
      subscriptionId: subscription.id,
      customerId: subscription.customer
    });

    // Create a PaymentIntent for Terminal to collect and charge
    const paymentIntent = await stripe.paymentIntents.create({
      amount: invoice.amount_due,
      currency: invoice.currency || 'usd',
      customer: subscription.customer,
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
      metadata: {
        invoiceId: invoice.id,
        subscriptionId: subscription.id,
        membershipId: membership._id.toString(),
        customerId: customer._id.toString(),
        orgId: org._id.toString(),
        recovery_type: 'terminal'
      }
    }, { stripeAccount: stripeAccountId });

    console.log('✅ Payment intent created:', paymentIntent.id);

    // Return payment intent details for terminal collection
    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      invoiceId: invoice.id,
      subscriptionId: subscription.id,
      amount: amountDue / 100
    });

  } catch (error) {
    console.error('❌ Payment intent creation error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to create payment intent',
      details: error.stack
    }, { status: 500 });
  }
}
