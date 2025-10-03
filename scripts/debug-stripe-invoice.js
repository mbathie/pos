/**
 * Script to debug Stripe invoice and subscription data
 * Usage: node scripts/debug-stripe-invoice.js <invoiceId>
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

async function debugInvoice(invoiceId, connectedAccountId = null) {
  try {
    console.log(`\n🔍 Debugging invoice: ${invoiceId}`);
    if (connectedAccountId) {
      console.log(`🔗 Connected account: ${connectedAccountId}`);
    }
    console.log('='.repeat(80));

    const options = connectedAccountId ? { stripeAccount: connectedAccountId } : {};

    // Retrieve invoice without expand
    console.log('\n📄 Invoice (without expand):');
    const invoiceBasic = await stripe.invoices.retrieve(
      invoiceId,
      null,
      options
    );
    console.log(JSON.stringify(invoiceBasic, null, 2));

    console.log('\n' + '='.repeat(80));

    // Retrieve invoice with expand
    console.log('\n📄 Invoice (with expand subscription):');
    const invoiceExpanded = await stripe.invoices.retrieve(
      invoiceId,
      {
        expand: ['subscription']
      },
      options
    );
    console.log(JSON.stringify(invoiceExpanded, null, 2));

    console.log('\n' + '='.repeat(80));

    // If subscription exists, retrieve it separately
    if (invoiceBasic.subscription) {
      console.log('\n📋 Subscription (retrieved separately):');
      const subscription = await stripe.subscriptions.retrieve(
        invoiceBasic.subscription,
        null,
        options
      );
      console.log(JSON.stringify(subscription, null, 2));
    } else {
      console.log('\n⚠️ Invoice has no subscription field');
      console.log('Invoice billing_reason:', invoiceBasic.billing_reason);
      console.log('Invoice lines:');
      invoiceBasic.lines.data.forEach((line, i) => {
        console.log(`  Line ${i + 1}:`, {
          description: line.description,
          amount: line.amount / 100,
          subscription: line.subscription,
          subscription_item: line.subscription_item
        });
      });
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.raw) {
      console.error('Raw error:', JSON.stringify(error.raw, null, 2));
    }
  } finally {
    process.exit(0);
  }
}

// Get invoice ID and optional connected account ID from command line
const invoiceId = process.argv[2];
const connectedAccountId = process.argv[3] || 'acct_1S8cLHQW6NT1TivB'; // Default to Marks Gyms

if (!invoiceId) {
  console.error('❌ Usage: node scripts/debug-stripe-invoice.js <invoiceId> [connectedAccountId]');
  console.error('\nExample:');
  console.error('  node scripts/debug-stripe-invoice.js in_1SDks5QW6NT1TivBLBOyvC02');
  console.error('  node scripts/debug-stripe-invoice.js in_1SDks5QW6NT1TivBLBOyvC02 acct_1S8cLHQW6NT1TivB');
  process.exit(1);
}

debugInvoice(invoiceId, connectedAccountId);
