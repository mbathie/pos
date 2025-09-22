#!/usr/bin/env node

/**
 * Test Script: Send Suspension Email
 *
 * This script tests the suspension email functionality
 *
 * Usage:
 *   node scripts/test-suspension-email.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';
import { sendSuspensionEmail, sendResumeEmail } from '../lib/email/suspension.js';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - always use development for test scripts
dotenv.config({ path: path.join(__dirname, '../.env.development') });

// Test data
const testCustomer = {
  name: 'Test Customer',
  email: process.env.ETHEREAL_SMTP_USER || 'test@example.com'
};

const testMembership = {
  _id: '68d0c5fb9187abb97c63368f',
  priceName: 'Adult Membership',
  amount: 50,
  unit: 'month',
  nextBillingDate: dayjs().add(15, 'days').toDate()
};

const testOrg = {
  name: 'Cultcha Fitness'
};

async function testSuspensionEmail() {
  console.log('='.repeat(60));
  console.log('Testing Suspension Email');
  console.log('='.repeat(60));

  try {
    const result = await sendSuspensionEmail({
      customer: testCustomer,
      membership: testMembership,
      org: testOrg,
      suspendedUntil: dayjs().add(7, 'days').toDate(),
      suspensionDays: 7,
      creditAmount: 11.67,
      isScheduled: true
    });

    if (result.success) {
      console.log('✅ Suspension email sent successfully!');
      console.log('Message ID:', result.messageId);

      if (result.previewUrl) {
        console.log('👁️ Preview URL:', result.previewUrl);
        console.log('\nOpen the preview URL above to see the email in your browser');
      }
    } else {
      console.log('❌ Failed to send suspension email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testResumeEmail() {
  console.log('\n' + '='.repeat(60));
  console.log('Testing Resume Email');
  console.log('='.repeat(60));

  try {
    const result = await sendResumeEmail({
      customer: testCustomer,
      membership: testMembership,
      org: testOrg,
      adjustmentAmount: 5.00,
      unusedDays: 3
    });

    if (result.success) {
      console.log('✅ Resume email sent successfully!');
      console.log('Message ID:', result.messageId);

      if (result.previewUrl) {
        console.log('👁️ Preview URL:', result.previewUrl);
        console.log('\nOpen the preview URL above to see the email in your browser');
      }
    } else {
      console.log('❌ Failed to send resume email:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  console.log('Starting Email Tests...\n');

  // Test suspension email
  await testSuspensionEmail();

  // Wait a bit between emails
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test resume email
  await testResumeEmail();

  console.log('\n' + '='.repeat(60));
  console.log('Email tests completed!');
  console.log('='.repeat(60));

  process.exit(0);
}

// Run the tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});