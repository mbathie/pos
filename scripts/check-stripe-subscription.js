#!/usr/bin/env node

const Stripe = require('stripe');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkSubscription(subscriptionId, stripeAccountId) {
  console.log('='.repeat(60));
  console.log(`Checking Stripe Subscription: ${subscriptionId}`);
  if (stripeAccountId) {
    console.log(`Connected Account: ${stripeAccountId}`);
  }
  console.log('='.repeat(60));

  try {
    // Build options for connected account if provided
    const options = stripeAccountId ? { stripeAccount: stripeAccountId } : {};

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, options);

    console.log('\n📊 Subscription Status:');
    console.log(`  Status: ${subscription.status}`);
    console.log(`  Customer: ${subscription.customer}`);
    console.log(`  Current Period: ${new Date(subscription.current_period_start * 1000).toLocaleDateString()} - ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`);

    // Check if paused
    if (subscription.pause_collection) {
      console.log('\n⏸️  Pause Collection Details:');
      console.log(`  Behavior: ${subscription.pause_collection.behavior}`);
      if (subscription.pause_collection.resumes_at) {
        console.log(`  Resumes at: ${new Date(subscription.pause_collection.resumes_at * 1000).toLocaleString()}`);
        console.log(`  Days until resume: ${Math.ceil((subscription.pause_collection.resumes_at * 1000 - Date.now()) / (1000 * 60 * 60 * 24))}`);
      }
    } else {
      console.log('\n✅ Subscription is active (not paused)');
    }

    // Get latest invoice
    console.log('\n📄 Latest Invoice:');
    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      limit: 1
    }, options);

    if (invoices.data.length > 0) {
      const invoice = invoices.data[0];
      console.log(`  Invoice ID: ${invoice.id}`);
      console.log(`  Amount: $${(invoice.amount_paid / 100).toFixed(2)}`);
      console.log(`  Status: ${invoice.status}`);
      console.log(`  Date: ${new Date(invoice.created * 1000).toLocaleDateString()}`);
    }

    // Check for recent invoice items (credits)
    console.log('\n💳 Recent Invoice Items (Credits/Debits):');
    const invoiceItems = await stripe.invoiceItems.list({
      customer: subscription.customer,
      limit: 5
    }, options);

    if (invoiceItems.data.length > 0) {
      invoiceItems.data.forEach(item => {
        const amount = item.amount / 100;
        const symbol = amount < 0 ? '💰 CREDIT' : '📝 CHARGE';
        console.log(`  ${symbol}: $${Math.abs(amount).toFixed(2)} - ${item.description}`);
        console.log(`    Created: ${new Date(item.date * 1000).toLocaleString()}`);
        if (item.metadata && Object.keys(item.metadata).length > 0) {
          console.log(`    Metadata:`, item.metadata);
        }
      });
    } else {
      console.log('  No recent invoice items found');
    }

    // Get upcoming invoice preview
    console.log('\n🔮 Upcoming Invoice Preview:');
    try {
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        subscription: subscriptionId
      }, options);
      console.log(`  Next billing date: ${new Date(upcomingInvoice.period_end * 1000).toLocaleDateString()}`);
      console.log(`  Amount due: $${(upcomingInvoice.amount_due / 100).toFixed(2)}`);

      // Show line items
      if (upcomingInvoice.lines.data.length > 0) {
        console.log('  Line items:');
        upcomingInvoice.lines.data.forEach(line => {
          console.log(`    - ${line.description}: $${(line.amount / 100).toFixed(2)}`);
        });
      }
    } catch (error) {
      if (error.code === 'invoice_upcoming_none') {
        console.log('  No upcoming invoice (subscription may be paused or cancelled)');
      } else {
        console.log(`  Error retrieving upcoming invoice: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error retrieving subscription:');
    console.error(`  ${error.message}`);
    if (error.code === 'resource_missing') {
      console.error('  This subscription does not exist in the current Stripe environment.');
      console.error('  Check if you are using the correct API keys (test vs live).');
      console.error('  If using Connected Accounts, make sure to provide the account ID.');
    }
  }

  console.log('\n' + '='.repeat(60));
}

// Check command line arguments
const subscriptionId = process.argv[2];
const stripeAccountId = process.argv[3]; // Optional connected account ID

if (!subscriptionId) {
  console.log('Usage: node check-stripe-subscription.js <subscription_id> [stripe_account_id]');
  console.log('Example: node check-stripe-subscription.js sub_1ABC123...');
  console.log('Example with connected account: node check-stripe-subscription.js sub_1ABC123... acct_1XYZ789...');
  process.exit(1);
}

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY not found in environment variables');
  console.error('Make sure .env file exists with STRIPE_SECRET_KEY');
  process.exit(1);
}

console.log('\n🔑 Using Stripe key:', process.env.STRIPE_SECRET_KEY.substring(0, 14) + '...');

// Run the check
checkSubscription(subscriptionId, stripeAccountId).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});