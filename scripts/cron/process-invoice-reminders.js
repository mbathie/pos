#!/usr/bin/env node

/**
 * Process Invoice Payment Reminders
 *
 * This script should be run daily (via cron/scheduled job) to send payment reminders
 * for outstanding invoices. Reminders are sent at 5, 3, and 1 days before the due date.
 *
 * Usage:
 *   node scripts/cron/process-invoice-reminders.js [--advance-days=N]
 *
 * Options:
 *   --advance-days=N    Simulate running the script N days from now (for testing)
 *                       Default: 0 (current day)
 *
 * Environment:
 *   Requires MONGODB_URI environment variable
 *
 * DigitalOcean App Platform:
 *   Can be configured as a scheduled job to run daily at 9am local time
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';
import { SignJWT } from 'jose';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (.env.development for local, .env for production)
import fs from 'fs';
const envDevPath = path.join(__dirname, '../../.env.development');
const envPath = path.join(__dirname, '../../.env');

if (fs.existsSync(envDevPath)) {
  dotenv.config({ path: envDevPath });
} else {
  dotenv.config({ path: envPath });
}

// Import models
import Transaction from '../../models/Transaction.js';
import Org from '../../models/Org.js';
import Company from '../../models/Company.js';
import Customer from '../../models/Customer.js';

// Import email function
import { sendInvoiceReminderEmail } from '../../lib/email/invoice-reminder.js';

// Parse command line arguments
const args = process.argv.slice(2);
let advanceDays = 0;

for (const arg of args) {
  if (arg.startsWith('--advance-days=')) {
    advanceDays = parseInt(arg.split('=')[1], 10);
    if (isNaN(advanceDays)) {
      console.error('Invalid --advance-days value. Must be a number.');
      process.exit(1);
    }
  }
}

// Logging utility
const log = (message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
};

// Reminder days before due date
const REMINDER_DAYS = [5, 3, 1];

/**
 * Generate payment link for a transaction
 */
async function generatePaymentLink(transaction, org) {
  try {
    const JWT_SECRET = new TextEncoder().encode(
      process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
    );

    const token = await new SignJWT({
      transactionId: transaction._id.toString(),
      orgId: org._id.toString(),
      type: 'payment_link'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('90d')
      .sign(JWT_SECRET);

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/pay/${transaction._id}?token=${token}`;
  } catch (error) {
    log(`Error generating payment link: ${error.message}`);
    return null;
  }
}

/**
 * Process reminders for a single organization
 */
async function processOrgReminders(org, simulatedDate) {
  const results = {
    orgId: org._id,
    orgName: org.name,
    reminders: [],
    errors: []
  };

  const paymentTermsDays = org.paymentTermsDays || 7;

  log(`Processing org: ${org.name} (Payment terms: ${paymentTermsDays} days)`);

  // Find invoices with outstanding balances for this org
  const invoiceStatuses = ['open', 'partially_paid'];
  const transactions = await Transaction.find({
    org: org._id,
    stripeInvoiceId: { $exists: true, $ne: null },
    invoiceStatus: { $in: invoiceStatuses },
    invoiceAmountDue: { $gt: 0 }
  }).populate('customer company');

  log(`Found ${transactions.length} outstanding invoices`);

  for (const transaction of transactions) {
    try {
      // Calculate due date based on transaction creation date + payment terms
      const dueDate = dayjs(transaction.createdAt).add(paymentTermsDays, 'day');
      const daysUntilDue = dueDate.diff(simulatedDate, 'day');

      // Check if we should send a reminder today
      if (!REMINDER_DAYS.includes(daysUntilDue)) {
        continue;
      }

      // Determine recipient (company or customer)
      const isCompanyInvoice = !!transaction.company;
      const recipient = isCompanyInvoice ? transaction.company : transaction.customer;

      if (!recipient) {
        log(`Skipping transaction ${transaction._id}: No recipient found`);
        results.errors.push({
          transactionId: transaction._id,
          error: 'No recipient found'
        });
        continue;
      }

      const recipientEmail = isCompanyInvoice
        ? recipient.contactEmail
        : recipient.email;
      const recipientName = isCompanyInvoice
        ? recipient.name
        : recipient.name;

      if (!recipientEmail) {
        log(`Skipping transaction ${transaction._id}: No email for recipient`);
        results.errors.push({
          transactionId: transaction._id,
          error: 'No email address'
        });
        continue;
      }

      // Generate payment link
      const paymentLink = await generatePaymentLink(transaction, org);

      // Send reminder email
      log(`Sending ${daysUntilDue}-day reminder to ${recipientEmail} for transaction ${transaction._id}`);

      await sendInvoiceReminderEmail({
        company: isCompanyInvoice ? recipient : null,
        customer: isCompanyInvoice ? null : recipient,
        org,
        transaction,
        dueDate: dueDate.toDate(),
        daysUntilDue,
        invoiceUrl: transaction.invoiceUrl,
        paymentLink
      });

      results.reminders.push({
        transactionId: transaction._id,
        recipientEmail,
        recipientName,
        daysUntilDue,
        amountDue: transaction.invoiceAmountDue
      });

      log(`✅ Reminder sent successfully`);

      // Add a small delay between emails
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      log(`Error processing transaction ${transaction._id}: ${error.message}`);
      results.errors.push({
        transactionId: transaction._id,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Main function to process all invoice reminders
 */
async function main() {
  log('='.repeat(60));
  log('INVOICE REMINDER PROCESSOR');
  log('='.repeat(60));

  if (advanceDays > 0) {
    log(`⚠️  TESTING MODE: Simulating ${advanceDays} days in the future`);
  }

  const simulatedDate = dayjs().add(advanceDays, 'day').startOf('day');
  log(`Processing for date: ${simulatedDate.format('YYYY-MM-DD')}`);

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pos');
    log('Connected to database');

    // Get all organizations
    const orgs = await Org.find({});
    log(`Found ${orgs.length} organization(s)`);

    if (orgs.length === 0) {
      log('No organizations found');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Process each organization
    const allResults = [];
    for (const org of orgs) {
      const results = await processOrgReminders(org, simulatedDate);
      allResults.push(results);

      // Add delay between organizations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Summary
    log('\n' + '='.repeat(60));
    log('PROCESSING SUMMARY');
    log('='.repeat(60));

    let totalReminders = 0;
    let totalErrors = 0;

    for (const result of allResults) {
      log(`\n${result.orgName}:`);
      log(`  Reminders sent: ${result.reminders.length}`);
      log(`  Errors: ${result.errors.length}`);

      totalReminders += result.reminders.length;
      totalErrors += result.errors.length;

      if (result.reminders.length > 0) {
        log(`  Details:`);
        result.reminders.forEach(r => {
          log(`    - ${r.recipientEmail}: ${r.daysUntilDue}-day reminder, $${r.amountDue?.toFixed(2)} due`);
        });
      }

      if (result.errors.length > 0) {
        log(`  Errors:`);
        result.errors.forEach(e => {
          log(`    - Transaction ${e.transactionId}: ${e.error}`);
        });
      }
    }

    log('\n' + '='.repeat(60));
    log(`TOTAL: ${totalReminders} reminders sent, ${totalErrors} errors`);
    log('='.repeat(60));

    await mongoose.disconnect();

    // Exit with error code if any failures
    process.exit(totalErrors > 0 ? 1 : 0);

  } catch (error) {
    log('Fatal error in invoice reminder processor:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  log('Unhandled error:', error);
  process.exit(1);
});
