/**
 * Script to advance the next payment for a customer's subscription
 * Usage: node scripts/advance-subscription-payment.js <customerId>
 *
 * This script:
 * 1. Finds active memberships for the customer
 * 2. Creates an invoice for the next billing period
 * 3. Finalizes and pays the invoice
 * 4. Triggers the webhook to process the payment
 *
 * NOTE: This script always uses .env.development for local testing
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Stripe from 'stripe';
import { connectDB } from '../lib/mongoose.js';
import { Membership, Customer, Org } from '../models/index.js';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.development explicitly for local testing
dotenv.config({ path: join(__dirname, '..', '.env.development') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function advanceSubscriptionPayment(customerId) {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }
    console.log(`\n📋 Customer: ${customer.name} (${customer.email})`);

    // Find active memberships
    const memberships = await Membership.find({
      customer: customerId,
      status: 'active'
    }).populate('product org');

    if (memberships.length === 0) {
      console.log('❌ No active memberships found for this customer');
      return;
    }

    console.log(`\n💳 Found ${memberships.length} active membership(s):\n`);

    // Process each membership
    for (const membership of memberships) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📦 Processing: ${membership.product?.name || 'Unknown Product'}`);
      console.log(`   Price: $${membership.amount}/${membership.unit}`);
      console.log(`   Subscription ID: ${membership.stripeSubscriptionId}`);

      // Skip manual subscriptions (not real Stripe subscriptions)
      if (membership.stripeSubscriptionId?.startsWith('manual_sub_')) {
        console.log('⏭️  Skipping: This is a manual subscription (not Stripe auto-billing)');
        continue;
      }

      // Get organization for Stripe account
      const org = membership.org;
      if (!org?.stripeAccountId) {
        console.log('❌ Error: Organization missing Stripe account ID');
        continue;
      }

      try {
        // Get subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(
          membership.stripeSubscriptionId,
          { stripeAccount: org.stripeAccountId }
        );

        console.log(`\n📊 Current subscription status:`);
        console.log(`   Status: ${subscription.status}`);
        console.log(`   Customer: ${subscription.customer}`);
        if (subscription.current_period_start && subscription.current_period_end) {
          console.log(`   Current period: ${new Date(subscription.current_period_start * 1000).toLocaleDateString()} - ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`);
        }

        if (subscription.metadata.hasLimitedBilling === 'true') {
          console.log(`   Billing: ${subscription.metadata.billingCount || 0}/${subscription.metadata.billingMax || 0}`);
        }

        // Create invoice for next billing period
        console.log(`\n⏳ Creating invoice...`);
        const invoice = await stripe.invoices.create(
          {
            customer: subscription.customer,
            subscription: membership.stripeSubscriptionId,
            description: `Manual advance payment for ${membership.product?.name}`
          },
          { stripeAccount: org.stripeAccountId }
        );
        console.log(`✅ Invoice created: ${invoice.id}`);

        // Finalize invoice
        console.log(`⏳ Finalizing invoice...`);
        const finalizedInvoice = await stripe.invoices.finalize(
          invoice.id,
          { stripeAccount: org.stripeAccountId }
        );
        console.log(`✅ Invoice finalized`);

        // Pay invoice
        console.log(`⏳ Paying invoice...`);
        const paidInvoice = await stripe.invoices.pay(
          invoice.id,
          { stripeAccount: org.stripeAccountId }
        );
        console.log(`✅ Invoice paid: $${(paidInvoice.amount_paid / 100).toFixed(2)}`);

        console.log(`\n🎉 Payment processed successfully!`);
        console.log(`   Invoice ID: ${paidInvoice.id}`);
        console.log(`   Amount: $${(paidInvoice.amount_paid / 100).toFixed(2)}`);
        console.log(`   Status: ${paidInvoice.status}`);
        console.log(`\n📧 Webhook should trigger shortly to:`);
        console.log(`   - Create transaction record`);
        console.log(`   - Update membership billing dates`);
        console.log(`   - Increment billing count`);
        console.log(`   - Send receipt email`);
        console.log(`\n📝 Check logs:`);
        console.log(`   - ./tmp/stripe-webhooks.log (detailed webhook logs)`);
        console.log(`   - Next.js console (real-time processing)`);

      } catch (error) {
        console.error(`\n❌ Error processing subscription:`, error.message);
        if (error.code) {
          console.error(`   Error code: ${error.code}`);
        }
      }
    }

    console.log(`\n${'='.repeat(80)}\n`);

  } catch (error) {
    console.error('❌ Script error:', error.message);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Get customer ID from command line
const customerId = process.argv[2];

if (!customerId) {
  console.error('❌ Usage: node scripts/advance-subscription-payment.js <customerId>');
  console.error('\nExample:');
  console.error('  node scripts/advance-subscription-payment.js 68d2dd8a10b6008a834d3b0e');
  process.exit(1);
}

// Run the script
console.log(`\n🚀 Advancing subscription payment for customer: ${customerId}\n`);
advanceSubscriptionPayment(customerId);
