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
    const { paymentIntentId } = body;

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent ID required' }, { status: 400 });
    }

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

    // Get the payment intent to verify it succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      { stripeAccount: stripeAccountId }
    );

    if (!(paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture')) {
      return NextResponse.json({
        error: `Payment intent not successful. Status: ${paymentIntent.status}`
      }, { status: 400 });
    }

    console.log('✅ Payment intent successful:', paymentIntentId);

    // Get the subscription
    const subscription = await stripe.subscriptions.retrieve(
      membership.stripeSubscriptionId,
      { stripeAccount: stripeAccountId }
    );

    // Get the invoice (refresh to get latest status)
    const invoiceId = paymentIntent.metadata?.invoiceId;
    const invoice = await stripe.invoices.retrieve(
      invoiceId,
      { stripeAccount: stripeAccountId }
    );

    console.log('📄 Invoice status:', invoice.status);
    console.log('📄 Invoice amount_due:', invoice.amount_due);
    console.log('📄 Invoice amount_paid:', invoice.amount_paid);

    const amountDue = invoice.amount_due / 100;

    // Extract payment method from the terminal payment
    const paymentMethodId = paymentIntent.payment_method;
    console.log('💳 Payment method from terminal:', paymentMethodId);

    // Check if payment method can be reused (card_present cannot be saved)
    let paymentMethodUpdated = false;
    let paymentMethodType = null;

    if (paymentMethodId) {
      try {
        // Retrieve payment method details
        const paymentMethod = await stripe.paymentMethods.retrieve(
          paymentMethodId,
          { stripeAccount: stripeAccountId }
        );

        paymentMethodType = paymentMethod.type;
        console.log('💳 Payment method type:', paymentMethodType);

        // card_present payment methods cannot be saved for future use
        if (paymentMethodType === 'card_present') {
          console.log('⚠️ card_present payment methods cannot be saved for future payments');
          console.log('ℹ️ Customer will need to provide a card for future renewals');
        } else {
          // Try to update subscription with the payment method
          await stripe.subscriptions.update(
            subscription.id,
            {
              default_payment_method: paymentMethodId,
              metadata: {
                ...subscription.metadata,
                last_recovery_date: new Date().toISOString(),
                recovery_payment_method: paymentMethodId
              }
            },
            { stripeAccount: stripeAccountId }
          );
          console.log('✅ Subscription default payment method updated to:', paymentMethodId);
          paymentMethodUpdated = true;
        }
      } catch (error) {
        console.error('❌ Error updating subscription payment method:', error);
        console.error('Error details:', error.message);
        // Continue anyway - invoice payment is more critical
      }
    }

    // The charge was taken via Terminal. Mark the invoice as paid out of band.
    if (invoice.status === 'open') {
      try {
        await stripe.invoices.pay(
          invoice.id,
          { paid_out_of_band: true },
          { stripeAccount: stripeAccountId }
        );
        console.log('✅ Invoice marked as paid (out of band)');
      } catch (error) {
        console.error('❌ Error paying invoice:', error);
        if (error.code === 'invoice_already_paid') {
          console.log('ℹ️ Invoice already paid, continuing...');
        } else {
          throw error;
        }
      }
    } else {
      console.log(`ℹ️ Invoice status is ${invoice.status}, skipping payment step`);
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
      paymentMethod: 'card',
      cart,
      stripe: {
        paymentIntentId,
        invoiceId: invoice.id,
        subscriptionId: subscription.id
      },
      metadata: {
        type: 'membership_recovery',
        originalInvoiceId: invoice.id,
        recoveryMethod: 'terminal',
        paymentMethodId: paymentMethodId,
        paymentMethodType: paymentMethodType,
        paymentMethodUpdated: paymentMethodUpdated,
        canReusePaymentMethod: paymentMethodType !== 'card_present'
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

    // Update membership billing dates
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
      paymentMethodUpdated: paymentMethodUpdated,
      paymentMethodId: paymentMethodId,
      paymentMethodType: paymentMethodType,
      invoiceId: invoice.id,
      message: 'Payment recovered successfully',
      warning: paymentMethodType === 'card_present'
        ? 'Terminal card payments cannot be saved. Customer will need to provide a card for future renewals.'
        : null
    });

  } catch (error) {
    console.error('❌ Payment completion error:', error);

    // Log Stripe-specific error details
    if (error.type) {
      console.error('Stripe error type:', error.type);
      console.error('Stripe error code:', error.code);
      console.error('Stripe error message:', error.message);
      console.error('Stripe error raw:', error.raw);
    }

    return NextResponse.json({
      error: error.message || 'Failed to complete payment recovery',
      stripeErrorCode: error.code,
      stripeErrorType: error.type,
      details: error.stack
    }, { status: 500 });
  }
}
