/**
 * Script to debug Stripe subscription data
 * Usage: node scripts/debug-subscription.js <subscriptionId> [connectedAccountId]
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Stripe from 'stripe';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.development explicitly for local testing
dotenv.config({ path: join(__dirname, '..', '.env.development') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function debugSubscription(subscriptionId, connectedAccountId = null) {
  try {
    console.log(`\n🔍 Debugging subscription: ${subscriptionId}`);
    if (connectedAccountId) {
      console.log(`🔗 Connected account: ${connectedAccountId}`);
    }
    console.log('='.repeat(80));

    const options = connectedAccountId ? { stripeAccount: connectedAccountId } : {};

    // Retrieve subscription
    console.log('\n📋 Subscription Details:');
    const subscription = await stripe.subscriptions.retrieve(
      subscriptionId,
      null,
      options
    );
    console.log(JSON.stringify(subscription, null, 2));

    console.log('\n' + '='.repeat(80));

    // Retrieve all invoices for this subscription
    console.log('\n📄 Invoices for this subscription:');
    const invoices = await stripe.invoices.list(
      {
        subscription: subscriptionId,
        limit: 10
      },
      options
    );
    
    console.log(`\nFound ${invoices.data.length} invoices:\n`);
    invoices.data.forEach((invoice, i) => {
      console.log(`Invoice ${i + 1}:`);
      console.log(`  ID: ${invoice.id}`);
      console.log(`  Status: ${invoice.status}`);
      console.log(`  Amount: ${invoice.amount_paid / 100} ${invoice.currency.toUpperCase()}`);
      console.log(`  Billing reason: ${invoice.billing_reason}`);
      console.log(`  Created: ${new Date(invoice.created * 1000).toLocaleString()}`);
      console.log(`  Period: ${new Date(invoice.period_start * 1000).toLocaleDateString()} - ${new Date(invoice.period_end * 1000).toLocaleDateString()}`);
      console.log('');
    });

    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.raw) {
      console.error('Raw error:', JSON.stringify(error.raw, null, 2));
    }
  } finally {
    process.exit(0);
  }
}

// Get subscription ID and optional connected account ID from command line
const subscriptionId = process.argv[2];
const connectedAccountId = process.argv[3] || 'acct_1S8cLHQW6NT1TivB'; // Default to Marks Gyms

if (!subscriptionId) {
  console.error('❌ Usage: node scripts/debug-subscription.js <subscriptionId> [connectedAccountId]');
  console.error('\nExample:');
  console.error('  node scripts/debug-subscription.js sub_1SDlQiQW6NT1TivBd59hkrXl');
  console.error('  node scripts/debug-subscription.js sub_1SDlQiQW6NT1TivBd59hkrXl acct_1S8cLHQW6NT1TivB');
  process.exit(1);
}

debugSubscription(subscriptionId, connectedAccountId);
