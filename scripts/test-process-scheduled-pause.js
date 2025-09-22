#!/usr/bin/env node

/**
 * Test Script: Process Scheduled Membership Pause (DEVELOPMENT ONLY)
 *
 * This script allows testing of scheduled pause processing by simulating
 * that a future pause date is today. Always uses .env.development database.
 *
 * Usage:
 *   node scripts/test-process-scheduled-pause.js --customer-id=CUSTOMER_ID [--dry-run]
 *   node scripts/test-process-scheduled-pause.js --membership-id=MEMBERSHIP_ID [--dry-run]
 *
 * Options:
 *   --customer-id=ID     The customer ID whose scheduled pause to process
 *   --membership-id=ID   The membership ID to process (alternative to customer-id)
 *   --dry-run           Show what would happen without making changes
 *
 * Example:
 *   node scripts/test-process-scheduled-pause.js --customer-id=68d0c5cdf1ba21d79dcbba13
 *
 * Note: Always connects to the development database (localhost:27017/pos)
 */

import mongoose from 'mongoose';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - always use development for test scripts
dotenv.config({ path: path.join(__dirname, '../.env.development') });

// Import models - need to import all referenced models
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Location from '../models/Location.js';
import Employee from '../models/Employee.js';
import Membership from '../models/Membership.js';
import Org from '../models/Org.js';
import Transaction from '../models/Transaction.js';

// Import email functions
import { sendSuspensionEmail } from '../lib/email/suspension.js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Parse command line arguments
const args = process.argv.slice(2);
const customerIdArg = args.find(arg => arg.startsWith('--customer-id='));
const membershipIdArg = args.find(arg => arg.startsWith('--membership-id='));
const dryRun = args.includes('--dry-run');

if (!customerIdArg && !membershipIdArg) {
  console.error('Error: --customer-id or --membership-id parameter is required');
  console.error('Usage: node scripts/test-process-scheduled-pause.js --customer-id=CUSTOMER_ID [--dry-run]');
  console.error('   or: node scripts/test-process-scheduled-pause.js --membership-id=MEMBERSHIP_ID [--dry-run]');
  process.exit(1);
}

const customerId = customerIdArg ? customerIdArg.split('=')[1] : null;
const membershipId = membershipIdArg ? membershipIdArg.split('=')[1] : null;

// Logging utility
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

/**
 * Process a single scheduled pause (test mode)
 */
async function processScheduledPause(membership) {
  try {
    log(`Processing scheduled pause for membership ${membership._id}`);

    if (dryRun) {
      log('🔸 DRY RUN MODE - No changes will be made');
    }

    // Get the organization for settings
    const org = await Org.findById(membership.org);
    if (!org) {
      throw new Error(`Organization not found for membership ${membership._id}`);
    }

    // Override dates to simulate processing today
    const originalPauseDate = new Date(membership.scheduledPauseDate);
    const daysDiff = Math.floor((originalPauseDate - new Date()) / (1000 * 60 * 60 * 24));

    log(`⚠️  TEST MODE: Simulating that scheduled pause date (${dayjs(originalPauseDate).format('YYYY-MM-DD')}) is TODAY`);
    log(`⚠️  This pause was originally scheduled for ${daysDiff} days from now`);

    const pauseStartsAt = new Date(); // Use today instead of scheduled date
    const resumesAt = new Date(membership.scheduledResumDate);
    const suspensionDays = membership.scheduledPauseDays;

    log(`Pause details:`, {
      membershipId: membership._id.toString(),
      customerId: membership.customer.toString(),
      originalScheduledDate: originalPauseDate,
      simulatedPauseDate: pauseStartsAt,
      resumesAt,
      suspensionDays,
      stripeSubscriptionId: membership.stripeSubscriptionId
    });

    // Check current Stripe subscription status first
    if (membership.stripeSubscriptionId && !dryRun) {
      const stripeOptions = org.stripeAccountId
        ? { stripeAccount: org.stripeAccountId }
        : {};

      try {
        const subscription = await stripe.subscriptions.retrieve(
          membership.stripeSubscriptionId,
          stripeOptions
        );

        log(`Current Stripe subscription status:`, {
          status: subscription.status,
          pause_collection: subscription.pause_collection,
          current_period_end: new Date(subscription.current_period_end * 1000),
          next_billing: membership.nextBillingDate
        });

        // Check if already paused
        if (subscription.pause_collection?.behavior === 'void') {
          log('⚠️  Subscription is already paused in Stripe');
        }
      } catch (err) {
        log(`Warning: Could not retrieve subscription: ${err.message}`);
      }
    }

    // Handle Stripe subscription pause
    let stripeUpdated = false;
    let invoiceItem = null;

    if (membership.stripeSubscriptionId && !dryRun) {
      try {
        const stripeOptions = org.stripeAccountId
          ? { stripeAccount: org.stripeAccountId }
          : {};

        // Pause the Stripe subscription
        await stripe.subscriptions.update(
          membership.stripeSubscriptionId,
          {
            pause_collection: {
              behavior: 'void',
              resumes_at: Math.floor(resumesAt.getTime() / 1000)
            }
          },
          stripeOptions
        );

        stripeUpdated = true;
        log(`✅ Stripe subscription paused successfully`);

        // Check if invoice item was already created
        // The negative invoice is typically created when the pause is scheduled
        const existingInvoiceItems = await stripe.invoiceItems.list(
          {
            customer: membership.stripeCustomerId,
            limit: 10
          },
          stripeOptions
        );

        const existingCredit = existingInvoiceItems.data.find(item =>
          item.metadata?.membershipId === membership._id.toString() &&
          item.metadata?.type === 'suspension_credit' &&
          item.amount < 0
        );

        if (existingCredit) {
          log(`ℹ️  Credit invoice item already exists:`, {
            id: existingCredit.id,
            amount: existingCredit.amount / 100,
            description: existingCredit.description
          });
          invoiceItem = existingCredit;
        } else {
          log(`ℹ️  No existing credit invoice item found - this is expected if credit was already created when pause was scheduled`);
        }

      } catch (stripeError) {
        log(`❌ Stripe error during pause:`, stripeError.message);
        stripeUpdated = false;
      }
    }

    if (!dryRun) {
      // Update the suspension record
      const suspensionIndex = membership.suspensions.findIndex(
        s => s.scheduledPause && !s.processedAt
      );

      if (suspensionIndex >= 0) {
        membership.suspensions[suspensionIndex].processedAt = new Date();
        log(`✅ Updated suspension record at index ${suspensionIndex}`);
      }

      // Update membership status
      membership.status = 'suspended';
      membership.suspendedUntil = resumesAt;

      // Clear scheduled pause fields
      membership.scheduledPauseDate = null;
      membership.scheduledResumDate = null;
      membership.scheduledPauseDays = null;

      await membership.save();
      log(`✅ Membership status updated to 'suspended'`);

      // Send suspension email
      try {
        const customer = await Customer.findById(membership.customer);
        const creditAmount = invoiceItem ? Math.abs(invoiceItem.amount / 100) : 0;

        await sendSuspensionEmail({
          customer,
          membership,
          org,
          suspendedUntil: resumesAt,
          suspensionDays,
          creditAmount,
          isScheduled: true
        });

        log(`✅ Suspension email sent to ${customer.email}`);
      } catch (emailError) {
        log(`⚠️  Failed to send suspension email: ${emailError.message}`);
      }
    } else {
      log(`🔸 DRY RUN: Would update membership status to 'suspended' and clear scheduled fields`);
      log(`🔸 DRY RUN: Would send suspension email to customer`);
    }

    log(`\n${'='.repeat(60)}`);
    log(`✅ TEST COMPLETED SUCCESSFULLY`);
    log(`${'='.repeat(60)}`);
    log(`Membership ${membership._id} has been processed`);
    log(`Status: ${dryRun ? 'DRY RUN (no changes made)' : 'SUSPENDED'}`);
    if (stripeUpdated) {
      log(`Stripe: Subscription paused until ${dayjs(resumesAt).format('YYYY-MM-DD')}`);
    }
    log(`Note: Credit invoice was likely already created when pause was originally scheduled`);

    return {
      success: true,
      membershipId: membership._id,
      stripeUpdated,
      dryRun
    };

  } catch (error) {
    log(`❌ Error processing scheduled pause:`, error.message);
    return {
      success: false,
      membershipId: membership._id,
      error: error.message
    };
  }
}

/**
 * Main test function
 */
async function main() {
  log('Starting TEST scheduled pause processor...');
  if (customerId) {
    log(`Customer ID: ${customerId}`);
  } else if (membershipId) {
    log(`Membership ID: ${membershipId}`);
  }
  log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  log('');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pos';
    log(`Connecting to: ${mongoUri.includes('@') ? mongoUri.split('@')[1].split('/')[0] + '/...' : mongoUri}`);
    await mongoose.connect(mongoUri);
    log('Connected to database');

    // Find membership with scheduled pause
    let membership;

    if (membershipId) {
      log(`Searching for membership with ID: ${membershipId}`);
      membership = await Membership.findOne({
        _id: membershipId,
        scheduledPauseDate: { $exists: true, $ne: null }
      });
    } else {
      log(`Searching for membership with customer ID: ${customerId}`);
      membership = await Membership.findOne({
        customer: customerId,
        scheduledPauseDate: { $exists: true, $ne: null }
      });
    }

    if (!membership) {
      log(`❌ No membership found with scheduled pause for customer ${customerId}`);

      // Try to find any membership for this customer
      const anyMembership = await Membership.findOne({ customer: customerId });
      if (anyMembership) {
        log(`ℹ️  Found membership ${anyMembership._id} but it has no scheduled pause`);
        log(`   Status: ${anyMembership.status}`);
        log(`   scheduledPauseDate: ${anyMembership.scheduledPauseDate}`);
        log(`   scheduledPauseDays: ${anyMembership.scheduledPauseDays}`);
        if (anyMembership.suspendedUntil) {
          log(`   Currently suspended until: ${dayjs(anyMembership.suspendedUntil).format('YYYY-MM-DD')}`);
        }
      } else {
        log(`❌ No membership found for customer ${customerId}`);

        // Debug: Let's see what memberships exist
        const count = await Membership.countDocuments();
        log(`   Total memberships in database: ${count}`);

        // Try finding with a more flexible query
        const anyScheduledPause = await Membership.findOne({
          scheduledPauseDate: { $exists: true, $ne: null }
        });
        if (anyScheduledPause) {
          log(`   Found a membership with scheduled pause for customer: ${anyScheduledPause.customer}`);
          log(`   You may want to use customer ID: ${anyScheduledPause.customer}`);
        }
      }

      await mongoose.disconnect();
      process.exit(1);
    }

    log(`Found membership with scheduled pause:`, {
      membershipId: membership._id,
      status: membership.status,
      scheduledPauseDate: membership.scheduledPauseDate,
      scheduledResumDate: membership.scheduledResumDate,
      scheduledPauseDays: membership.scheduledPauseDays
    });

    // Process the scheduled pause
    const result = await processScheduledPause(membership);

    if (!result.success) {
      log(`❌ Failed to process scheduled pause: ${result.error}`);
      await mongoose.disconnect();
      process.exit(1);
    }

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    log('❌ Fatal error in test processor:', error.message || error);
    console.error('Full error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  log('❌ Unhandled error:', error);
  process.exit(1);
});