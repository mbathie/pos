import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Customer, Membership, Org } from '@/models';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function GET(request, { params }) {
  try {
    await connectDB();

    // Authenticate employee
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: customerId, membershipId } = await params;

    // Validate membership
    const membership = await Membership.findById(membershipId);
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

    console.log('📝 Subscription details:', {
      id: subscription.id,
      default_payment_method: subscription.default_payment_method,
      customer: subscription.customer
    });

    // Get payment method if one is set
    let paymentMethodDetails = null;
    let paymentMethodId = subscription.default_payment_method;

    // If subscription doesn't have a default payment method, check the customer
    if (!paymentMethodId) {
      console.log('⚠️ No default_payment_method set on subscription, checking customer...');
      try {
        const customer = await stripe.customers.retrieve(
          subscription.customer,
          { stripeAccount: stripeAccountId }
        );

        console.log('👤 Customer payment method:', {
          invoice_settings_default: customer.invoice_settings?.default_payment_method,
          default_source: customer.default_source
        });

        // Try invoice_settings.default_payment_method first, then default_source
        paymentMethodId = customer.invoice_settings?.default_payment_method || customer.default_source;
      } catch (error) {
        console.error('❌ Error retrieving customer:', error);
      }
    }

    if (paymentMethodId) {
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(
          paymentMethodId,
          { stripeAccount: stripeAccountId }
        );

        console.log('💳 Payment method retrieved:', {
          id: paymentMethod.id,
          type: paymentMethod.type,
          card: paymentMethod.card ? {
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            exp_month: paymentMethod.card.exp_month,
            exp_year: paymentMethod.card.exp_year
          } : null
        });

        if (paymentMethod.card) {
          paymentMethodDetails = {
            id: paymentMethod.id,
            type: paymentMethod.type,
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            expMonth: paymentMethod.card.exp_month,
            expYear: paymentMethod.card.exp_year
          };
        }
      } catch (error) {
        console.error('❌ Error retrieving payment method:', error);
        // Continue without payment method details
      }
    } else {
      console.log('⚠️ No payment method found on subscription or customer');
    }

    return NextResponse.json({
      hasPaymentMethod: !!paymentMethodDetails,
      paymentMethod: paymentMethodDetails,
      subscriptionId: subscription.id
    });

  } catch (error) {
    console.error('❌ Error retrieving payment method:', error);
    return NextResponse.json({
      error: error.message || 'Failed to retrieve payment method',
      details: error.stack
    }, { status: 500 });
  }
}
