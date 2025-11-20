import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { connectDB } from '@/lib/mongoose';
import { Transaction, Membership, Customer, Org, Product } from '@/models';
import { sendTransactionReceipt } from '@/lib/email/receipt';
import { prepareCartForTransaction } from '@/lib/payments/success';
import { handleInvoicePayment, handleInvoiceUpdate } from '@/lib/stripe/invoice';
import { Types } from 'mongoose';
import fs from 'fs/promises';
import path from 'path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Logs webhook events to file with detailed information
 */
async function logWebhookEvent(eventType, data) {
  try {
    const logDir = path.join(process.cwd(), 'tmp');
    const logFile = path.join(logDir, 'stripe-webhooks.log');

    // Ensure tmp directory exists
    await fs.mkdir(logDir, { recursive: true });

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${eventType}\n${JSON.stringify(data, null, 2)}\n${'='.repeat(100)}\n`;

    await fs.appendFile(logFile, logEntry);
    console.log(`✅ Logged ${eventType} to ${logFile}`);
  } catch (error) {
    console.error('❌ Failed to write to log file:', error);
    // Don't throw - logging failure shouldn't break webhook processing
  }
}

/**
 * Creates a transaction record for a subscription renewal payment
 */
async function createRenewalTransaction({ invoice, subscription, customer, organization, product, membership }) {
  // Build a minimal cart for the renewal transaction
  const cart = {
    products: [{
      type: 'membership',
      name: product?.name || subscription.metadata.productName || 'Membership Renewal',
      _id: subscription.metadata.productId,
      prices: [{
        name: subscription.metadata.priceName || 'Subscription',
        value: invoice.amount_paid / 100,
        billingFrequency: subscription.metadata.billingFrequency || 'monthly'
      }]
    }],
    total: invoice.total / 100,
    tax: (invoice.tax || 0) / 100,
    subtotal: invoice.subtotal / 100
  };

  // Clean the cart using existing utility
  const cleanCart = prepareCartForTransaction(cart);

  const transaction = await Transaction.create({
    customer: customer._id,
    org: organization._id,
    location: membership?.location || null,
    total: invoice.total / 100,
    tax: (invoice.tax || 0) / 100,
    subtotal: invoice.subtotal / 100,
    status: 'completed',
    paymentMethod: 'stripe',
    cart: cleanCart,
    stripe: {
      paymentIntentId: invoice.payment_intent,
      invoiceId: invoice.id,
      subscriptionId: subscription.id
    },
    metadata: {
      type: 'subscription_renewal',
      billingReason: invoice.billing_reason
    }
  });

  return transaction;
}

/**
 * Updates membership record with new billing information
 */
async function updateMembershipBilling({ subscription, invoice, membership }) {
  // Calculate billing dates from the invoice period (more reliable than subscription object)
  // In newer Stripe API versions, subscription.current_period_end may not be included
  const periodEnd = invoice.lines?.data?.[0]?.period?.end || invoice.period_end;

  if (!periodEnd) {
    console.error('❌ Cannot determine next billing date:', {
      invoiceId: invoice.id,
      hasPeriodEnd: !!invoice.period_end,
      hasLinePeriod: !!invoice.lines?.data?.[0]?.period?.end
    });
    throw new Error('Cannot determine next billing date from invoice');
  }

  const nextBillingDate = new Date(periodEnd * 1000);
  const lastBillingDate = new Date(invoice.created * 1000);

  console.log('📅 Updating membership billing dates:', {
    nextBillingDate: nextBillingDate.toISOString(),
    lastBillingDate: lastBillingDate.toISOString(),
    isValidDate: !isNaN(nextBillingDate.getTime())
  });

  // Update membership
  membership.nextBillingDate = nextBillingDate;
  membership.lastBillingDate = lastBillingDate;
  membership.status = subscription.status === 'active' ? 'active' : subscription.status;

  await membership.save();

  return membership;
}

/**
 * Handles invoice.paid event for subscription renewals
 */
async function handleInvoicePaid(invoiceOrPayment, stripeAccount) {
  console.log('📄 Processing invoice.paid event:', invoiceOrPayment.id);

  // Determine the invoice ID
  let invoiceId;
  if (invoiceOrPayment.id && invoiceOrPayment.id.startsWith('inpay_')) {
    console.log('🔍 Received InvoicePayment object, fetching actual invoice...');
    if (!invoiceOrPayment.invoice) {
      console.log('⏭️ InvoicePayment missing invoice reference');
      return { skipped: true, reason: 'no_invoice_reference' };
    }
    invoiceId = invoiceOrPayment.invoice;
  } else {
    invoiceId = invoiceOrPayment.id;
  }

  // Always retrieve the full invoice to ensure all fields (especially subscription) are populated
  // The webhook event object doesn't always include complete data
  const invoice = await stripe.invoices.retrieve(
    invoiceId,
    {
      expand: ['subscription']
    },
    {
      stripeAccount
    }
  );
  console.log('✅ Retrieved full invoice:', invoice.id);

  // Extract subscription ID from invoice (handle both old and new Stripe API formats)
  let subscriptionId = invoice.subscription; // Old format: direct field
  if (!subscriptionId && invoice.parent?.subscription_details?.subscription) {
    subscriptionId = invoice.parent.subscription_details.subscription; // New format: nested in parent
  }
  if (!subscriptionId && invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription) {
    subscriptionId = invoice.lines.data[0].parent.subscription_item_details.subscription; // Fallback: from line items
  }

  console.log('📄 Invoice details:', {
    subscriptionId,
    billing_reason: invoice.billing_reason,
    customer: invoice.customer,
    amount: invoice.amount_paid / 100
  });

  // Skip if this is the first invoice (already handled during subscription creation)
  if (invoice.billing_reason === 'subscription_create') {
    console.log('⏭️ Skipping subscription_create invoice (already processed)');
    return { skipped: true, reason: 'subscription_create' };
  }

  // Check if invoice has a subscription
  if (!subscriptionId) {
    console.log('⏭️ Skipping invoice without subscription (not a subscription renewal)');
    return { skipped: true, reason: 'no_subscription' };
  }

  // Get the subscription
  const subscription = await stripe.subscriptions.retrieve(
    subscriptionId,
    null,
    {
      stripeAccount
    }
  );

  if (!subscription) {
    throw new Error(`Subscription not found: ${invoice.subscription}`);
  }

  console.log('📋 Subscription metadata:', subscription.metadata);

  // Get customer and organization from database
  const customerId = subscription.metadata.customerId;
  const orgId = subscription.metadata.orgId;
  const productId = subscription.metadata.productId;

  if (!customerId || !orgId) {
    throw new Error('Missing customer or organization ID in subscription metadata');
  }

  await connectDB();

  // Check for duplicate invoice processing (idempotency)
  const existingTransaction = await Transaction.findOne({
    'stripe.invoiceId': invoice.id
  });

  if (existingTransaction) {
    console.log(`⏭️ Invoice already processed: ${invoice.id} (Transaction: ${existingTransaction._id})`);
    return {
      skipped: true,
      reason: 'already_processed',
      transactionId: existingTransaction._id
    };
  }

  const customer = await Customer.findById(customerId);
  const organization = await Org.findById(orgId);
  const product = productId ? await Product.findById(productId) : null;

  if (!customer || !organization) {
    throw new Error(`Customer or organization not found: ${customerId}, ${orgId}`);
  }

  // Find the membership record
  const membership = await Membership.findOne({
    customer: customerId,
    product: productId,
    stripeSubscriptionId: subscription.id,
    status: { $in: ['active', 'suspended'] }
  });

  if (!membership) {
    console.warn(`⚠️ Membership not found for subscription ${subscription.id}`);
  }

  // Create transaction record
  const transaction = await createRenewalTransaction({
    invoice,
    subscription,
    customer,
    organization,
    product,
    membership
  });

  console.log(`✅ Created transaction record: ${transaction._id}`);

  // Update membership billing info
  if (membership) {
    await updateMembershipBilling({ subscription, invoice, membership });
    console.log(`✅ Updated membership billing for: ${membership._id}`);
  }

  // Handle billingMax enforcement
  let billingEnforcement = null;
  const hasLimitedBilling = subscription.metadata.hasLimitedBilling === 'true';

  if (hasLimitedBilling) {
    const billingMax = parseInt(subscription.metadata.billingMax || '0');
    const currentCount = parseInt(subscription.metadata.billingCount || '0');
    const newCount = currentCount + 1;

    console.log(`💳 Billing count: ${newCount}/${billingMax}`);

    // Update billing count in subscription metadata
    await stripe.subscriptions.update(
      subscription.id,
      {
        metadata: {
          ...subscription.metadata,
          billingCount: newCount.toString()
        }
      },
      { stripeAccount }
    );

    // Check if we've reached the limit
    if (newCount >= billingMax) {
      console.log(`🛑 Billing limit reached (${newCount}/${billingMax}), cancelling subscription`);

      await stripe.subscriptions.update(
        subscription.id,
        {
          cancel_at_period_end: true
        },
        { stripeAccount }
      );

      billingEnforcement = {
        action: 'cancelled',
        reason: 'billing_max_reached',
        billingCount: newCount,
        billingMax: billingMax
      };

      // Update membership to reflect upcoming cancellation
      if (membership) {
        // Get period end from invoice (same as we do for billing dates)
        const cancelPeriodEnd = invoice.lines?.data?.[0]?.period?.end || invoice.period_end;

        membership.cancelAtPeriodEnd = true;
        membership.cancellationScheduledFor = cancelPeriodEnd ? new Date(cancelPeriodEnd * 1000) : null;
        await membership.save();
      }
    } else {
      billingEnforcement = {
        action: 'continued',
        billingCount: newCount,
        billingMax: billingMax,
        remaining: billingMax - newCount
      };
    }
  }

  // Send receipt email
  let receiptInfo = null;
  if (customer.email) {
    try {
      const emailResult = await sendTransactionReceipt({
        transaction: await transaction.populate('org', 'name email logo'),
        recipientEmail: customer.email,
        org: organization
      });

      receiptInfo = {
        sent: true,
        email: customer.email,
        provider: process.env.EMAIL_PLATFORM || 'unknown',
        messageId: emailResult?.messageId || null
      };

      console.log(`📧 Receipt sent to ${customer.email}`);
    } catch (error) {
      console.error('❌ Failed to send receipt:', error);
      receiptInfo = {
        sent: false,
        email: customer.email,
        error: error.message
      };
    }
  }

  // Calculate billing dates from invoice (same as updateMembershipBilling)
  const periodEnd = invoice.lines?.data?.[0]?.period?.end || invoice.period_end;
  const periodStart = invoice.lines?.data?.[0]?.period?.start || invoice.period_start;
  const nextBillingDate = periodEnd ? new Date(periodEnd * 1000) : null;
  const currentPeriodStart = periodStart ? new Date(periodStart * 1000) : null;

  // Prepare detailed log data
  const logData = {
    eventType: 'invoice.paid',
    customerId: customer._id.toString(),
    customerName: customer.name,
    customerEmail: customer.email,
    subscriptionId: subscription.id,
    invoiceId: invoice.id,
    billingDetails: {
      amount: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      tax: (invoice.tax || 0) / 100,
      total: invoice.total / 100
    },
    billingCycle: billingEnforcement || { type: 'indefinite' },
    nextBillingDate: nextBillingDate?.toISOString() || null,
    currentPeriod: {
      start: currentPeriodStart?.toISOString() || null,
      end: nextBillingDate?.toISOString() || null
    },
    transactionId: transaction._id.toString(),
    membershipId: membership?._id?.toString() || null,
    receipt: receiptInfo,
    metadata: {
      productId: subscription.metadata.productId,
      productName: subscription.metadata.productName,
      priceName: subscription.metadata.priceName,
      organizationId: orgId
    }
  };

  // Log to file
  await logWebhookEvent('invoice.paid', logData);

  return {
    success: true,
    transactionId: transaction._id,
    billingEnforcement,
    receiptSent: receiptInfo?.sent || false
  };
}

/**
 * Handles invoice.payment_failed event for subscription renewals
 */
async function handleInvoicePaymentFailed(invoiceOrPayment, stripeAccount) {
  console.log('📄 Processing invoice.payment_failed event:', invoiceOrPayment.id);

  // Determine the invoice ID
  let invoiceId;
  if (invoiceOrPayment.id && invoiceOrPayment.id.startsWith('inpay_')) {
    if (!invoiceOrPayment.invoice) {
      console.log('⏭️ InvoicePayment missing invoice reference');
      return { skipped: true, reason: 'no_invoice_reference' };
    }
    invoiceId = invoiceOrPayment.invoice;
  } else {
    invoiceId = invoiceOrPayment.id;
  }

  // Retrieve the full invoice
  const invoice = await stripe.invoices.retrieve(
    invoiceId,
    { expand: ['subscription'] },
    { stripeAccount }
  );
  console.log('✅ Retrieved full invoice:', invoice.id);

  // Extract subscription ID
  let subscriptionId = invoice.subscription;
  if (!subscriptionId && invoice.parent?.subscription_details?.subscription) {
    subscriptionId = invoice.parent.subscription_details.subscription;
  }
  if (!subscriptionId && invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription) {
    subscriptionId = invoice.lines.data[0].parent.subscription_item_details.subscription;
  }

  console.log('📄 Failed invoice details:', {
    subscriptionId,
    billing_reason: invoice.billing_reason,
    customer: invoice.customer,
    amount: invoice.amount_due / 100,
    attempt_count: invoice.attempt_count
  });

  // Skip if no subscription
  if (!subscriptionId) {
    console.log('⏭️ Skipping invoice without subscription');
    return { skipped: true, reason: 'no_subscription' };
  }

  // Get the subscription
  const subscription = await stripe.subscriptions.retrieve(
    subscriptionId,
    null,
    { stripeAccount }
  );

  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }

  // Get customer and organization from database
  const customerId = subscription.metadata.customerId;
  const orgId = subscription.metadata.orgId;
  const productId = subscription.metadata.productId;

  if (!customerId || !orgId) {
    throw new Error('Missing customer or organization ID in subscription metadata');
  }

  await connectDB();

  const customer = await Customer.findById(customerId);
  const organization = await Org.findById(orgId);
  const product = productId ? await Product.findById(productId) : null;

  if (!customer || !organization) {
    throw new Error(`Customer or organization not found: ${customerId}, ${orgId}`);
  }

  // Find the membership record
  const membership = await Membership.findOne({
    customer: customerId,
    product: productId,
    stripeSubscriptionId: subscription.id,
    status: { $in: ['active', 'suspended'] }
  });

  // Create failed transaction record
  const cart = {
    products: [{
      type: 'membership',
      name: product?.name || subscription.metadata.productName || 'Membership Renewal',
      _id: subscription.metadata.productId,
      prices: [{
        name: subscription.metadata.priceName || 'Subscription',
        value: invoice.amount_due / 100,
        billingFrequency: subscription.metadata.billingFrequency || 'monthly'
      }]
    }],
    total: invoice.total / 100,
    tax: (invoice.tax || 0) / 100,
    subtotal: invoice.subtotal / 100
  };

  const cleanCart = prepareCartForTransaction(cart);

  const transaction = await Transaction.create({
    customer: customer._id,
    org: organization._id,
    location: membership?.location || null,
    total: invoice.total / 100,
    tax: (invoice.tax || 0) / 100,
    subtotal: invoice.subtotal / 100,
    status: 'failed',
    paymentMethod: 'stripe',
    cart: cleanCart,
    stripe: {
      paymentIntentId: invoice.payment_intent,
      invoiceId: invoice.id,
      subscriptionId: subscription.id
    },
    metadata: {
      type: 'subscription_renewal_failed',
      billingReason: invoice.billing_reason,
      attemptCount: invoice.attempt_count,
      failureMessage: invoice.last_finalization_error?.message || 'Payment failed'
    }
  });

  console.log(`✅ Created failed transaction record: ${transaction._id}`);

  // Send failure notification email
  let emailInfo = null;
  if (customer.email) {
    try {
      const emailResult = await sendPaymentFailedEmail({
        customer,
        organization,
        invoice,
        subscription,
        product,
        membership
      });

      emailInfo = {
        sent: true,
        email: customer.email,
        provider: process.env.EMAIL_PLATFORM || 'unknown',
        messageId: emailResult?.messageId || null
      };

      console.log(`📧 Payment failed email sent to ${customer.email}`);
    } catch (error) {
      console.error('❌ Failed to send payment failed email:', error);
      emailInfo = {
        sent: false,
        email: customer.email,
        error: error.message
      };
    }
  }

  // Log to file
  await logWebhookEvent('invoice.payment_failed', {
    eventType: 'invoice.payment_failed',
    customerId: customer._id.toString(),
    customerName: customer.name,
    customerEmail: customer.email,
    subscriptionId: subscription.id,
    invoiceId: invoice.id,
    billingDetails: {
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      attemptCount: invoice.attempt_count
    },
    transactionId: transaction._id.toString(),
    membershipId: membership?._id?.toString() || null,
    email: emailInfo,
    metadata: {
      productId: subscription.metadata.productId,
      productName: subscription.metadata.productName,
      organizationId: orgId,
      failureMessage: invoice.last_finalization_error?.message || 'Payment failed'
    }
  });

  return {
    success: true,
    transactionId: transaction._id,
    emailSent: emailInfo?.sent || false
  };
}

/**
 * Send payment failed notification email
 */
async function sendPaymentFailedEmail({ customer, organization, invoice, subscription, product, membership }) {
  const { sendEmail, getFromAddress } = await import('@/lib/mailer.js');
  const dayjs = (await import('dayjs')).default;

  const amount = invoice.amount_due / 100;
  const nextRetryDate = invoice.next_payment_attempt
    ? dayjs(invoice.next_payment_attempt * 1000).format('MMMM D, YYYY')
    : null;

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Failed - ${organization?.name || 'Membership'}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #424770; background-color: #f6f9fc; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.07);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); border-radius: 8px 8px 0 0; padding: 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 500;">
            Payment Failed
          </h1>
        </div>

        <!-- Content -->
        <div style="padding: 40px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${customer.name},</p>

          <p style="font-size: 16px; margin-bottom: 20px;">
            We were unable to process your payment for your ${product?.name || 'membership'} subscription.
          </p>

          <div style="background-color: #f6f9fc; border-radius: 6px; padding: 20px; margin: 30px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding: 8px 0; color: #8898aa; font-size: 14px;">Amount Due</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 16px;">$${amount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #8898aa; font-size: 14px;">Membership</td>
                <td style="padding: 8px 0; text-align: right;">${product?.name || 'Membership'}</td>
              </tr>
              ${nextRetryDate ? `
              <tr>
                <td style="padding: 8px 0; color: #8898aa; font-size: 14px;">Next Retry</td>
                <td style="padding: 8px 0; text-align: right;">${nextRetryDate}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>What happens next?</strong><br>
              ${nextRetryDate
                ? `We'll automatically retry your payment on ${nextRetryDate}. Please ensure your payment method has sufficient funds.`
                : 'Please update your payment method to continue your membership.'
              }
            </p>
          </div>

          <p style="font-size: 16px; margin-top: 30px;">
            To update your payment method or if you have any questions, please contact us at ${organization?.email || 'support'}.
          </p>

          <p style="font-size: 16px; margin-top: 30px;">
            Thank you,<br>
            <strong>${organization?.name || 'The Team'}</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="padding: 30px 40px; background-color: #f6f9fc; border-radius: 0 0 8px 8px; text-align: center;">
          ${organization?.name ? `<p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">${organization.name}</p>` : ''}
          ${organization?.phone ? `<p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">Phone: ${organization.phone}</p>` : ''}
          ${organization?.email ? `<p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">Email: ${organization.email}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  const emailText = `
Payment Failed

Hi ${customer.name},

We were unable to process your payment for your ${product?.name || 'membership'} subscription.

Amount Due: $${amount.toFixed(2)}
Membership: ${product?.name || 'Membership'}
${nextRetryDate ? `Next Retry: ${nextRetryDate}` : ''}

What happens next?
${nextRetryDate
  ? `We'll automatically retry your payment on ${nextRetryDate}. Please ensure your payment method has sufficient funds.`
  : 'Please update your payment method to continue your membership.'
}

To update your payment method or if you have any questions, please contact us at ${organization?.email || 'support'}.

Thank you,
${organization?.name || 'The Team'}
  `.trim();

  const mailOptions = {
    from: getFromAddress(organization?.name || 'Membership'),
    to: customer.email,
    replyTo: organization?.email || 'noreply@cultcha.app',
    subject: `Payment Failed - ${organization?.name || 'Membership'}`,
    text: emailText,
    html: emailHTML
  };

  return await sendEmail(mailOptions);
}

/**
 * Main webhook handler
 */
export async function POST(req) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    console.log(`🎣 Webhook received: ${event.type}`);

    // Get the connected account ID from the event
    const stripeAccount = event.account || null;

    // Handle different event types
    switch (event.type) {
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
      case 'invoice_payment.paid': // Non-standard event name sometimes sent by Stripe
        const invoice = event.data.object;

        // Check if this is a company invoice (has transactionId in metadata)
        if (invoice.metadata?.transactionId && !invoice.subscription) {
          // Company invoice payment
          await handleInvoicePayment({ invoice, stripeAccountId: stripeAccount });
          console.log(`✅ Company invoice paid: ${invoice.id}`);
        } else {
          // Subscription invoice payment (existing logic)
          const result = await handleInvoicePaid(invoice, stripeAccount);
          console.log(`✅ ${event.type} processed:`, result);
        }
        break;

      case 'invoice.updated':
        const updatedInvoice = event.data.object;

        // Check if this is a company invoice
        if (updatedInvoice.metadata?.transactionId && !updatedInvoice.subscription) {
          // Company invoice update (partial payment tracking)
          await handleInvoiceUpdate({ invoice: updatedInvoice, stripeAccountId: stripeAccount });
          console.log(`✅ Company invoice updated: ${updatedInvoice.id}`);
        }
        break;

      case 'invoice.payment_failed':
        console.log('❌ Invoice payment failed:', event.data.object.id);
        const failedInvoice = event.data.object;

        // Check if this is a company invoice
        if (failedInvoice.metadata?.transactionId && !failedInvoice.subscription) {
          // Company invoice payment failed
          await Transaction.findByIdAndUpdate(failedInvoice.metadata.transactionId, {
            invoiceStatus: 'open', // Keep open for retry
            paymentFailedAt: new Date()
          });
          console.log(`❌ Company invoice payment failed: ${failedInvoice.id}`);
        } else {
          // Subscription invoice payment failed (existing logic)
          const failedResult = await handleInvoicePaymentFailed(failedInvoice, stripeAccount);
          console.log(`❌ invoice.payment_failed processed:`, failedResult);
        }
        break;

      case 'customer.subscription.deleted':
        console.log('🗑️ Subscription deleted:', event.data.object.id);
        // TODO: Update membership status to cancelled
        await logWebhookEvent('customer.subscription.deleted', {
          subscriptionId: event.data.object.id,
          customerId: event.data.object.metadata?.customerId
        });
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);

    // Log error to file
    await logWebhookEvent('webhook.error', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}
