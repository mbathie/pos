/**
 * Script to advance Stripe Test Clock for subscription testing
 * Usage: node scripts/advance-test-clock.js <customerId>
 *
 * This script:
 * 1. Finds active memberships for the customer
 * 2. Advances the test clock to trigger the next billing cycle
 * 3. Waits for Stripe webhook to process the payment
 *
 * NOTE: This only works in development mode with test clocks
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Stripe from 'stripe';
import { connectDB } from '../lib/mongoose.js';
import { Membership, Customer } from '../models/index.js';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.development explicitly for local testing
dotenv.config({ path: join(__dirname, '..', '.env.development') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function advanceTestClock(customerId) {
  try {
    await connectDB();
    console.log('✅ Connected to database\n');

    // Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }
    console.log(`📋 Customer: ${customer.name} (${customer.email})\n`);

    // Find active memberships with test clocks
    const memberships = await Membership.find({
      customer: customerId,
      status: 'active',
      testClockId: { $exists: true, $ne: null }
    }).populate('product org');

    if (memberships.length === 0) {
      console.log('❌ No active memberships with test clocks found for this customer');
      console.log('   Make sure the membership was created in dev mode with test clocks enabled');
      return;
    }

    console.log(`💳 Found ${memberships.length} active membership(s) with test clocks:\n`);

    // Process each membership
    for (const membership of memberships) {
      console.log(`${'='.repeat(80)}`);
      console.log(`📦 Processing: ${membership.product?.name || 'Unknown Product'}`);
      console.log(`   Price: $${membership.amount}/${membership.unit}`);
      console.log(`   Subscription ID: ${membership.stripeSubscriptionId}`);
      console.log(`   Test Clock ID: ${membership.testClockId}`);
      console.log(`   Next billing date: ${membership.nextBillingDate.toLocaleDateString()}`);

      try {
        // Get the test clock
        const testClock = await stripe.testHelpers.testClocks.retrieve(
          membership.testClockId,
          { stripeAccount: membership.org.stripeAccountId }
        );

        console.log(`\n⏰ Current test clock time: ${new Date(testClock.frozen_time * 1000).toLocaleString()}`);

        // Calculate time to advance (advance to next billing date + 1 hour buffer)
        const currentTime = new Date(testClock.frozen_time * 1000);
        const nextBillingTime = new Date(membership.nextBillingDate);
        const BUFFER_SECONDS = 3600; // 1 hour buffer to ensure Stripe processes the invoice
        const secondsToAdvance = Math.floor((nextBillingTime - currentTime) / 1000);

        if (secondsToAdvance <= 0) {
          console.log(`⚠️  Next billing date is in the past or now, advancing by 1 day instead`);
          // Advance by 1 day + buffer
          await stripe.testHelpers.testClocks.advance(
            membership.testClockId,
            {
              frozen_time: testClock.frozen_time + (24 * 60 * 60) + BUFFER_SECONDS
            },
            { stripeAccount: membership.org.stripeAccountId }
          );
        } else {
          console.log(`\n⏩ Advancing test clock by ${Math.floor(secondsToAdvance / 86400)} days + 1 hour buffer...`);

          // Advance the test clock to next billing date + 1 hour buffer
          await stripe.testHelpers.testClocks.advance(
            membership.testClockId,
            {
              frozen_time: Math.floor(nextBillingTime.getTime() / 1000) + BUFFER_SECONDS
            },
            { stripeAccount: membership.org.stripeAccountId }
          );
        }

        console.log(`✅ Test clock advanced successfully`);
        console.log(`\n📧 Stripe will now process the subscription renewal`);
        console.log(`   - Invoice will be created automatically`);
        console.log(`   - Webhook will be triggered (invoice.paid)`);
        console.log(`   - Transaction record will be created`);
        console.log(`   - Membership billing dates will be updated`);
        console.log(`   - Receipt email will be sent`);
        console.log(`\n📝 Check webhook logs:`);
        console.log(`   - ./tmp/stripe-webhooks.log (detailed webhook logs)`);
        console.log(`   - Next.js console (real-time processing)`);
        console.log(`\n⏳ Wait a few seconds for Stripe to process...`);

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
  console.error('❌ Usage: node scripts/advance-test-clock.js <customerId>');
  console.error('\nExample:');
  console.error('  node scripts/advance-test-clock.js 68dde960d7748d37a5a6426f');
  console.error('\nNote: This only works with subscriptions created using test clocks (dev mode)');
  process.exit(1);
}

console.log(`\n🚀 Advancing test clock for customer: ${customerId}\n`);
advanceTestClock(customerId);
