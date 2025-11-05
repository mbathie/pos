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
    const body = await request.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method ID required' }, { status: 400 });
    }

    // Validate customer and membership
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

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

    // Get Stripe customer ID from subscription
    const stripeCustomerId = subscription.customer;

    console.log('📝 Updating payment method for subscription:', {
      subscriptionId: subscription.id,
      stripeCustomerId: stripeCustomerId,
      dbCustomerId: customer.stripeCustomerId,
      paymentMethodId
    });

    // Verify customer exists on connected account
    try {
      const stripeCustomer = await stripe.customers.retrieve(
        stripeCustomerId,
        { stripeAccount: stripeAccountId }
      );
      console.log('✅ Customer verified on connected account:', stripeCustomer.id);
    } catch (error) {
      console.error('❌ Customer not found on connected account:', stripeCustomerId);
      throw new Error(`Customer ${stripeCustomerId} not found on connected account`);
    }

    // Check if payment method belongs to platform or connected account
    let finalPaymentMethodId = paymentMethodId;

    try {
      // Try to retrieve on connected account first
      await stripe.paymentMethods.retrieve(
        paymentMethodId,
        { stripeAccount: stripeAccountId }
      );
      console.log('✅ Payment method already exists on connected account');
    } catch (error) {
      // If not found, it's a platform payment method - need to clone it
      if (error.code === 'resource_missing') {
        console.log('⚠️ Payment method is platform-owned, cloning to connected account...');

        try {
          // Clone the payment method to the connected account (without customer initially)
          const clonedPaymentMethod = await stripe.paymentMethods.create(
            {
              payment_method: paymentMethodId,
            },
            { stripeAccount: stripeAccountId }
          );

          finalPaymentMethodId = clonedPaymentMethod.id;
          console.log('✅ Payment method cloned to connected account:', finalPaymentMethodId);
        } catch (cloneError) {
          console.error('❌ Failed to clone payment method:', cloneError);
          throw new Error('Failed to clone payment method to connected account: ' + cloneError.message);
        }
      } else {
        throw error;
      }
    }

    // Attach the payment method to the customer if not already attached
    try {
      await stripe.paymentMethods.attach(
        finalPaymentMethodId,
        { customer: stripeCustomerId },
        { stripeAccount: stripeAccountId }
      );
      console.log('✅ Payment method attached to customer');
    } catch (error) {
      // If already attached, continue
      if (error.code === 'resource_missing' || error.code === 'payment_method_already_attached') {
        console.log('ℹ️ Payment method already attached');
      } else {
        console.log('⚠️ Error attaching payment method:', error.message);
      }
    }

    // Update the subscription's default payment method
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        default_payment_method: finalPaymentMethodId,
        metadata: {
          ...subscription.metadata,
          payment_method_updated_at: new Date().toISOString(),
          updated_by_employee: employee._id.toString()
        }
      },
      { stripeAccount: stripeAccountId }
    );

    console.log('✅ Subscription payment method updated successfully');

    // Get updated payment method details
    const paymentMethod = await stripe.paymentMethods.retrieve(
      finalPaymentMethodId,
      { stripeAccount: stripeAccountId }
    );

    let paymentMethodDetails = null;
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

    return NextResponse.json({
      success: true,
      message: 'Payment method updated successfully',
      paymentMethod: paymentMethodDetails,
      subscriptionId: updatedSubscription.id
    });

  } catch (error) {
    console.error('❌ Error updating payment method:', error);
    return NextResponse.json({
      error: error.message || 'Failed to update payment method',
      details: error.stack
    }, { status: 500 });
  }
}
