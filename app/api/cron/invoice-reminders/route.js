import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Transaction, Org, Company, Customer } from '@/models';
import { sendInvoiceReminderEmail } from '@/lib/email/invoice-reminder';
import { SignJWT } from 'jose';
import dayjs from 'dayjs';

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
    console.error('Error generating payment link:', error.message);
    return null;
  }
}

/**
 * GET /api/cron/invoice-reminders
 * Process invoice payment reminders
 *
 * Query params:
 *   advanceDays - Simulate running the script N days from now (for testing)
 *   cronSecret - Optional secret to validate cron requests
 */
export async function GET(request) {
  console.log('\n' + '='.repeat(60));
  console.log('INVOICE REMINDER PROCESSOR (API)');
  console.log('='.repeat(60));

  // Validate cron secret if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const advanceDays = parseInt(searchParams.get('advanceDays') || '0', 10);

  if (advanceDays > 0) {
    console.log(`⚠️  TESTING MODE: Simulating ${advanceDays} days in the future`);
  }

  const simulatedDate = dayjs().add(advanceDays, 'day').startOf('day');
  console.log(`Processing for date: ${simulatedDate.format('YYYY-MM-DD')}`);

  try {
    await connectDB();

    // Get all organizations
    const orgs = await Org.find({});
    console.log(`Found ${orgs.length} organization(s)`);

    if (orgs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No organizations found',
        summary: { totalReminders: 0, totalErrors: 0 }
      });
    }

    const allResults = [];

    // Process each organization
    for (const org of orgs) {
      const results = {
        orgId: org._id,
        orgName: org.name,
        reminders: [],
        errors: []
      };

      const paymentTermsDays = org.paymentTermsDays || 7;
      console.log(`\nProcessing org: ${org.name} (Payment terms: ${paymentTermsDays} days)`);

      // Find invoices with outstanding balances for this org
      const invoiceStatuses = ['open', 'partially_paid'];
      const transactions = await Transaction.find({
        org: org._id,
        stripeInvoiceId: { $exists: true, $ne: null },
        invoiceStatus: { $in: invoiceStatuses },
        invoiceAmountDue: { $gt: 0 }
      });

      console.log(`Found ${transactions.length} outstanding invoices`);

      for (const transaction of transactions) {
        try {
          // Calculate due date based on transaction creation date + payment terms
          const dueDate = dayjs(transaction.createdAt).add(paymentTermsDays, 'day');
          const daysUntilDue = dueDate.diff(simulatedDate, 'day');

          // Check if we should send a reminder today
          if (!REMINDER_DAYS.includes(daysUntilDue)) {
            continue;
          }

          // Get recipient details
          let recipient = null;
          let isCompanyInvoice = false;

          if (transaction.company) {
            recipient = await Company.findById(transaction.company);
            isCompanyInvoice = true;
          } else if (transaction.customer) {
            recipient = await Customer.findById(transaction.customer);
          }

          if (!recipient) {
            console.log(`Skipping transaction ${transaction._id}: No recipient found`);
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
            console.log(`Skipping transaction ${transaction._id}: No email for recipient`);
            results.errors.push({
              transactionId: transaction._id,
              error: 'No email address'
            });
            continue;
          }

          // Generate payment link
          const paymentLink = await generatePaymentLink(transaction, org);

          // Send reminder email
          console.log(`Sending ${daysUntilDue}-day reminder to ${recipientEmail} for transaction ${transaction._id}`);

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

          console.log(`✅ Reminder sent successfully`);

          // Add a small delay between emails
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`Error processing transaction ${transaction._id}:`, error.message);
          results.errors.push({
            transactionId: transaction._id,
            error: error.message
          });
        }
      }

      allResults.push(results);
    }

    // Calculate summary
    let totalReminders = 0;
    let totalErrors = 0;

    for (const result of allResults) {
      totalReminders += result.reminders.length;
      totalErrors += result.errors.length;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`TOTAL: ${totalReminders} reminders sent, ${totalErrors} errors`);
    console.log('='.repeat(60));

    return NextResponse.json({
      success: true,
      processedDate: simulatedDate.format('YYYY-MM-DD'),
      summary: {
        totalReminders,
        totalErrors
      },
      results: allResults
    });

  } catch (error) {
    console.error('Fatal error in invoice reminder processor:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
