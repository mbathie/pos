#!/usr/bin/env node

/**
 * Process Scheduled Membership Pauses
 *
 * This script should be run daily (via cron/scheduled job) to process any membership
 * pauses that are scheduled to start today. It handles the Stripe integration and
 * credit calculations that would normally happen with an immediate pause.
 *
 * Usage:
 *   node scripts/process-scheduled-pauses.js
 *
 * Environment:
 *   Requires MONGODB_URI and STRIPE_SECRET_KEY environment variables
 *
 * DigitalOcean App Platform:
 *   Can be configured as a scheduled job to run daily at midnight UTC
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

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models - we need to import the model files directly for the script
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

// Logging utility
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

/**
 * Process a single scheduled pause
 */
async function processScheduledPause(membership) {
  try {
    log(`Processing scheduled pause for membership ${membership._id}`);

    // Get the organization for settings
    const org = await Org.findById(membership.org);
    if (!org) {
      throw new Error(`Organization not found for membership ${membership._id}`);
    }

    const pauseStartsAt = new Date(membership.scheduledPauseDate);
    const resumesAt = new Date(membership.scheduledResumDate);
    const suspensionDays = membership.scheduledPauseDays;

    log(`Pause details:`, {
      membershipId: membership._id,
      customerId: membership.customer,
      pauseStartsAt,
      resumesAt,
      suspensionDays,
      stripeSubscriptionId: membership.stripeSubscriptionId
    });

    // Handle Stripe subscription pause
    let stripeUpdated = false;
    let invoiceItem = null;

    if (membership.stripeSubscriptionId) {
      try {
        // Use connected account if available
        const stripeOptions = org.stripeAccountId
          ? { stripeAccount: org.stripeAccountId }
          : {};

        // Pause the Stripe subscription
        await stripe.subscriptions.update(
          membership.stripeSubscriptionId,
          {
            pause_collection: {
              behavior: 'void',
              resumes_at: Math.floor(resumesAt.getTime() / 1000) // Unix timestamp
            }
          },
          stripeOptions
        );

        stripeUpdated = true;
        log(`Stripe subscription paused successfully`);

        // Calculate and create credit invoice item
        let daysInPeriod;
        if (membership.unit === 'month') {
          daysInPeriod = 30;
        } else if (membership.unit === 'year') {
          daysInPeriod = 365;
        } else if (membership.unit === 'week') {
          daysInPeriod = 7;
        } else {
          daysInPeriod = 30;
        }

        const dailyRate = membership.amount / daysInPeriod;

        // Calculate days until next billing from pause start date
        const daysUntilNextBilling = Math.ceil(
          (new Date(membership.nextBillingDate) - pauseStartsAt) / (1000 * 60 * 60 * 24)
        );
        const creditDays = Math.min(suspensionDays, daysUntilNextBilling);
        const creditAmount = Math.round(dailyRate * creditDays * 100); // In cents

        // Create credit invoice item
        if (membership.stripeCustomerId && creditAmount > 0) {
          invoiceItem = await stripe.invoiceItems.create(
            {
              customer: membership.stripeCustomerId,
              amount: -creditAmount, // Negative amount for credit
              currency: 'aud',
              description: `Membership suspension credit: ${suspensionDays} days (scheduled)`,
              subscription: membership.stripeSubscriptionId,
              metadata: {
                type: 'suspension_credit',
                suspensionDays: suspensionDays.toString(),
                membershipId: membership._id.toString(),
                customerId: membership.customer.toString(),
                scheduledPause: 'true'
              }
            },
            stripeOptions
          );

          log(`Credit invoice item created: $${creditAmount / 100}`);
        }
      } catch (stripeError) {
        log(`Stripe error during pause:`, stripeError.message);
        // Continue with local pause even if Stripe fails
        stripeUpdated = false;
      }
    }

    // Update the suspension record that was created when the pause was scheduled
    const suspensionIndex = membership.suspensions.findIndex(
      s => s.scheduledPause &&
           dayjs(s.suspendedAt).format('YYYY-MM-DD') === dayjs(pauseStartsAt).format('YYYY-MM-DD')
    );

    if (suspensionIndex >= 0) {
      membership.suspensions[suspensionIndex].stripeInvoiceItemId = invoiceItem?.id || null;
      membership.suspensions[suspensionIndex].processedAt = new Date();
    }

    // Update membership status to suspended
    membership.status = 'suspended';
    membership.suspendedUntil = resumesAt;

    // Clear scheduled pause fields as they're now processed
    membership.scheduledPauseDate = null;
    membership.scheduledResumDate = null;
    membership.scheduledPauseDays = null;

    // Save the updated membership
    await membership.save();

    // Create transaction record if credit was applied
    if (invoiceItem) {
      const creditAmountDollars = Math.abs(invoiceItem.amount / 100);

      await Transaction.create({
        org: org._id,
        location: membership.location,
        customer: membership.customer,
        employee: null, // System-generated
        paymentMethod: 'adjustment',
        type: 'adjustment',
        status: 'success',
        amount: -creditAmountDollars,
        tax: 0,
        discount: 0,
        surcharge: 0,
        total: -creditAmountDollars,
        notes: `Scheduled membership suspension: ${suspensionDays} days (processed by cron)`,
        stripePaymentIntentId: invoiceItem.id,
        products: [{
          product: membership.product,
          name: 'Membership Suspension Credit',
          quantity: suspensionDays,
          price: -(creditAmountDollars / suspensionDays),
          total: -creditAmountDollars
        }]
      });
    }

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

      log(`Suspension email sent to customer ${membership.customer}`);
    } catch (emailError) {
      log(`Failed to send suspension email:`, emailError.message);
      // Don't fail the process if email fails
    }

    log(`Successfully processed scheduled pause for membership ${membership._id}`);

    return {
      success: true,
      membershipId: membership._id,
      stripeUpdated,
      creditAmount: invoiceItem ? Math.abs(invoiceItem.amount / 100) : 0
    };

  } catch (error) {
    log(`Error processing scheduled pause for membership ${membership._id}:`, error.message);

    return {
      success: false,
      membershipId: membership._id,
      error: error.message
    };
  }
}

/**
 * Main function to process all scheduled pauses for today
 */
async function main() {
  log('Starting scheduled pause processor...');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pos');
    log('Connected to database');

    // Get today's date at midnight for comparison
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();

    // Find all memberships with scheduled pauses for today
    const membershipsToProcess = await Membership.find({
      status: 'active',
      scheduledPauseDate: {
        $gte: todayStart,
        $lt: todayEnd
      }
    });

    log(`Found ${membershipsToProcess.length} membership(s) scheduled for pause today`);

    if (membershipsToProcess.length === 0) {
      log('No scheduled pauses to process');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Process each membership
    const results = [];
    for (const membership of membershipsToProcess) {
      const result = await processScheduledPause(membership);
      results.push(result);

      // Add a small delay between processing to avoid overwhelming Stripe API
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    log('='.repeat(60));
    log('PROCESSING SUMMARY');
    log('='.repeat(60));
    log(`Total processed: ${results.length}`);
    log(`Successful: ${successful.length}`);
    log(`Failed: ${failed.length}`);

    if (successful.length > 0) {
      log('\nSuccessful pauses:');
      successful.forEach(r => {
        log(`  - Membership ${r.membershipId}: Credit $${r.creditAmount.toFixed(2)}`);
      });
    }

    if (failed.length > 0) {
      log('\nFailed pauses:');
      failed.forEach(r => {
        log(`  - Membership ${r.membershipId}: ${r.error}`);
      });
    }

    await mongoose.disconnect();

    // Exit with error code if any failures
    process.exit(failed.length > 0 ? 1 : 0);

  } catch (error) {
    log('Fatal error in scheduled pause processor:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  log('Unhandled error:', error);
  process.exit(1);
});