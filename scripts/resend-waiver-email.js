#!/usr/bin/env node
/**
 * Re-send waiver email for a company transaction
 * Usage: node scripts/resend-waiver-email.js <transactionId>
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Override/set environment variables for local script execution
process.env.MONGODB_URI = 'mongodb://localhost:27017/pos'; // Always use local DB for scripts
if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000';
}
if (!process.env.NEXT_PUBLIC_DOMAIN) {
  process.env.NEXT_PUBLIC_DOMAIN = 'http://localhost:3000';
}
if (!process.env.EMAIL_PLATFORM) {
  process.env.EMAIL_PLATFORM = 'brevo'; // Default to Brevo for production emails
}

import { connectDB } from '../lib/mongoose.js';
import { Transaction, Org, Company } from '../models/index.js';
import { sendCompanyWaiverEmail } from '../lib/email/company-waiver.js';

async function resendWaiverEmail(transactionId) {
  try {
    await connectDB();

    console.log(`\n🔍 Looking up transaction: ${transactionId}\n`);

    // Fetch transaction
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      console.error(`❌ Transaction not found: ${transactionId}`);
      process.exit(1);
    }

    console.log(`✅ Found transaction: ${transaction._id}`);
    console.log(`   Created: ${transaction.createdAt}`);
    console.log(`   Total: $${(transaction.total / 100).toFixed(2)}`);

    // Check if this is a company transaction
    if (!transaction.company && !transaction.companyPayment) {
      console.error(`❌ This is not a company transaction (no company field)`);
      process.exit(1);
    }

    // Company details are stored in companyPayment field
    const company = {
      _id: transaction.company,
      name: transaction.companyPayment.companyName,
      contactName: transaction.companyPayment.contactName,
      contactEmail: transaction.companyPayment.contactEmail,
      abn: transaction.companyPayment.abn
    };

    console.log(`\n📋 Company Details:`);
    console.log(`   Name: ${company.name}`);
    console.log(`   Contact: ${company.contactName}`);
    console.log(`   Email: ${company.contactEmail}`);

    // Fetch organization
    const org = await Org.findById(transaction.org);

    if (!org) {
      console.error(`❌ Organization not found: ${transaction.org}`);
      process.exit(1);
    }

    console.log(`\n🏢 Organization: ${org.name}`);

    // Generate waiver link
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    const waiverLink = `${baseUrl}/schedule/${transaction._id}/waiver`;

    console.log(`\n🔗 Waiver Link: ${waiverLink}`);

    // Send email
    console.log(`\n📧 Sending waiver email to: ${company.contactEmail}...`);

    await sendCompanyWaiverEmail({
      company,
      org,
      waiverLink,
      transaction
    });

    console.log(`\n✅ Waiver email sent successfully!\n`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Get transaction ID from command line
const transactionId = process.argv[2];

if (!transactionId) {
  console.error(`
❌ Missing transaction ID

Usage:
  node scripts/resend-waiver-email.js <transactionId>

Example:
  node scripts/resend-waiver-email.js 507f1f77bcf86cd799439011
  `);
  process.exit(1);
}

resendWaiverEmail(transactionId);
