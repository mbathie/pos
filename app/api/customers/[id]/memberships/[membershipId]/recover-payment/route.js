import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Customer, Membership, Product, Transaction, Org } from '@/models';
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
    const { isSimulation = false } = body;

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
    const amountDue = invoice.amount_due / 100; // Convert from cents to dollars

    console.log('💰 Processing payment recovery for invoice:', {
      invoiceId: invoice.id,
      subscriptionId: subscription.id,
      amountDue,
      isSimulation
    });

    let paymentMethodId;
    let paymentIntentId;

    if (isSimulation) {
      // Simulated payment - create a test payment method
      console.log('🧪 Creating simulated payment...');

      // Create a test payment method
      const paymentMethod = await stripe.paymentMethods.create({
        type: 'card',
        card: {
          token: 'tok_visa' // Test token for Visa card
        }
      }, { stripeAccount: stripeAccountId });

      paymentMethodId = paymentMethod.id;

      // Attach payment method to customer BEFORE creating payment intent
      await stripe.paymentMethods.attach(
        paymentMethodId,
        { customer: subscription.customer },
        { stripeAccount: stripeAccountId }
      );
      console.log('✅ Payment method attached to customer');

      // Create a payment intent for the invoice amount
      const paymentIntent = await stripe.paymentIntents.create({
        amount: invoice.amount_due,
        currency: invoice.currency || 'usd',
        customer: subscription.customer,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        metadata: {
          invoiceId: invoice.id,
          subscriptionId: subscription.id,
          membershipId: membership._id.toString(),
          customerId: customer._id.toString(),
          orgId: org._id.toString(),
          recovery_type: 'simulated'
        }
      }, { stripeAccount: stripeAccountId });

      paymentIntentId = paymentIntent.id;

      console.log('✅ Simulated payment created:', paymentIntentId);

    } else {
      // Real terminal payment
      console.log('💳 Creating real terminal payment...');

      // Create payment intent for terminal
      const paymentIntent = await stripe.terminal.readers.processPaymentIntent(
        body.terminalId,
        {
          payment_intent: await stripe.paymentIntents.create({
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
          }, { stripeAccount: stripeAccountId }).then(pi => pi.id)
        },
        { stripeAccount: stripeAccountId }
      );

      if (paymentIntent.error) {
        throw new Error(paymentIntent.error.message || 'Terminal payment failed');
      }

      paymentIntentId = paymentIntent.payment_intent;

      // Get the payment method from the payment intent
      const completedIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId,
        { stripeAccount: stripeAccountId }
      );

      paymentMethodId = completedIntent.payment_method;

      console.log('✅ Terminal payment completed:', paymentIntentId);
    }

    // Update subscription default payment method only for simulated (attachable) cards
    if (isSimulation && paymentMethodId) {
      await stripe.subscriptions.update(
        subscription.id,
        {
          default_payment_method: paymentMethodId,
          metadata: {
            ...subscription.metadata,
            last_recovery_date: new Date().toISOString()
          }
        },
        { stripeAccount: stripeAccountId }
      );
      console.log('✅ Subscription payment method updated (simulation)');
    }

    // Pay the invoice
    if (isSimulation) {
      // Normal pay path (uses attached card)
      await stripe.invoices.pay(
        invoice.id,
        { stripeAccount: stripeAccountId }
      );
      console.log('✅ Invoice paid (simulation)');
    } else {
      // Terminal charge already collected; mark as paid out of band
      await stripe.invoices.pay(
        invoice.id,
        { paid_out_of_band: true },
        { stripeAccount: stripeAccountId }
      );
      console.log('✅ Invoice marked as paid (terminal out-of-band)');
    }

    // Create transaction record
    const product = membership.product;
    const cart = {
      products: [{
        type: 'membership',
        name: product?.name || 'Membership Recovery',
        _id: product?._id,
        prices: [{
          name: 'Recovery Payment',
          value: amountDue,
          billingFrequency: subscription.metadata?.billingFrequency || 'monthly'
        }]
      }],
      total: amountDue,
      tax: (invoice.tax || 0) / 100,
      subtotal: (invoice.subtotal || 0) / 100
    };

    const transaction = await Transaction.create({
      customer: customer._id,
      org: org._id,
      location: membership.location?._id || employee.selectedLocationId,
      employee: employee._id,
      total: amountDue,
      tax: (invoice.tax || 0) / 100,
      subtotal: (invoice.subtotal || 0) / 100,
      status: 'completed',
      paymentMethod: isSimulation ? 'card' : 'card',
      cart,
      stripe: {
        paymentIntentId,
        invoiceId: invoice.id,
        subscriptionId: subscription.id
      },
      metadata: {
        type: 'membership_recovery',
        originalInvoiceId: invoice.id,
        recoveryMethod: isSimulation ? 'simulated' : 'terminal',
        paymentMethodUpdated: !!paymentMethodId
      }
    });

    console.log('✅ Transaction record created:', transaction._id);

    // Mark the original failed transaction as recovered
    await Transaction.findOneAndUpdate(
      {
        'stripe.invoiceId': invoice.id,
        status: 'failed'
      },
      {
        $set: {
          'metadata.recoveredBy': transaction._id,
          'metadata.recoveredAt': new Date()
        }
      }
    );
    console.log('✅ Failed transaction marked as recovered');

    // Update membership billing dates (same as successful renewal)
    const periodEnd = invoice.lines?.data?.[0]?.period?.end || invoice.period_end;
    if (periodEnd) {
      const nextBillingDate = new Date(periodEnd * 1000);
      const lastBillingDate = new Date(invoice.created * 1000);

      membership.nextBillingDate = nextBillingDate;
      membership.lastBillingDate = lastBillingDate;

      // Reactivate if suspended
      if (membership.status === 'suspended') {
        membership.status = 'active';
      }

      await membership.save();
      console.log('✅ Membership billing dates updated');
    }

    // Send success response
    return NextResponse.json({
      success: true,
      transactionId: transaction._id,
      amount: amountDue,
      nextBillingDate: membership.nextBillingDate,
      paymentMethodUpdated: !!paymentMethodId,
      invoiceId: invoice.id,
      message: 'Payment recovered successfully'
    });

  } catch (error) {
    console.error('❌ Payment recovery error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to process payment recovery',
      details: error.stack
    }, { status: 500 });
  }
}
