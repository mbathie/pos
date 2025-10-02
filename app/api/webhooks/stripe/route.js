import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { connectDB } from '@/lib/mongoose';
import { Transaction, Membership, Customer, Organization, Product } from '@/models';
import { sendTransactionReceipt } from '@/lib/email/receipt';
import { prepareCartForTransaction } from '@/lib/payments/success';
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
async function createRenewalTransaction({ invoice, subscription, customer, organization, product }) {
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
    customer: Types.ObjectId.createFromHexString(customer._id),
    org: Types.ObjectId.createFromHexString(organization._id),
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
    },
    createdAt: new Date(invoice.created * 1000)
  });

  return transaction;
}

/**
 * Updates membership record with new billing information
 */
async function updateMembershipBilling({ subscription, invoice, membership }) {
  // Calculate next billing date
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  // Update membership
  membership.nextBillingDate = currentPeriodEnd;
  membership.lastBillingDate = new Date(invoice.created * 1000);
  membership.status = subscription.status === 'active' ? 'active' : subscription.status;

  await membership.save();

  return membership;
}

/**
 * Handles invoice.paid event for subscription renewals
 */
async function handleInvoicePaid(invoice, stripeAccount) {
  console.log('📄 Processing invoice.paid event:', invoice.id);

  // Skip if this is the first invoice (already handled during subscription creation)
  if (invoice.billing_reason === 'subscription_create') {
    console.log('⏭️ Skipping subscription_create invoice (already processed)');
    return { skipped: true, reason: 'subscription_create' };
  }

  // Get the subscription
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription, {
    stripeAccount
  });

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

  const customer = await Customer.findById(customerId);
  const organization = await Organization.findById(orgId);
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
    product
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
        membership.cancelAtPeriodEnd = true;
        membership.cancellationScheduledFor = new Date(subscription.current_period_end * 1000);
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

  // Calculate next billing date
  const nextBillingDate = new Date(subscription.current_period_end * 1000);

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
    nextBillingDate: nextBillingDate.toISOString(),
    currentPeriod: {
      start: new Date(subscription.current_period_start * 1000).toISOString(),
      end: nextBillingDate.toISOString()
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
 * Main webhook handler
 */
export async function POST(req) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature');

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
        const result = await handleInvoicePaid(event.data.object, stripeAccount);
        console.log('✅ invoice.paid processed:', result);
        break;

      case 'invoice.payment_failed':
        console.log('❌ Invoice payment failed:', event.data.object.id);
        // TODO: Handle failed payments (notify customer, update membership status)
        await logWebhookEvent('invoice.payment_failed', {
          invoiceId: event.data.object.id,
          customerId: event.data.object.customer,
          amount: event.data.object.amount_due / 100
        });
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
