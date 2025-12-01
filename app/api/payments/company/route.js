import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { createCompanyTransaction, handleTransactionSuccess, addPlaceholdersToSchedule } from '@/lib/payments/success'
import { sendCompanyWaiverEmail } from '@/lib/email/company-waiver';
import { getOrCreateCompanyStripeCustomer } from '@/lib/stripe/company-customer';
import { createCompanyInvoice } from '@/lib/stripe/invoice';
import { Org } from '@/models';
import { SignJWT } from 'jose';

export async function POST(req, { params }) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         COMPANY PAYMENT & INVOICE CREATION STARTED          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  await connectDB();

  const { employee } = await getEmployee();
  const { cart, company, paymentType } = await req.json();

  console.log('📋 Request Details:');
  console.log('   Employee:', employee.email);
  console.log('   Organization ID:', employee.org._id);
  console.log('   Payment Type:', paymentType);
  console.log('   Company ID:', company?._id);
  console.log('   Company Name:', company?.name);
  console.log('   Company Email:', company?.contactEmail);
  console.log('   Cart Total:', cart?.total);
  console.log('   Cart Products:', cart?.products?.length);

  if (!company || !company._id) {
    console.error('❌ Company information missing!');
    return NextResponse.json({
      error: 'Company information is required for company payments'
    }, { status: 400 });
  }

  console.log('\n🔍 Fetching organization details...');
  const org = await Org.findById(employee.org._id);
  console.log('✅ Organization found:', org.name);
  console.log('   Stripe Account ID:', org.stripeAccountId || '⚠️ MISSING');

  // Create the company transaction (zero payment upfront)
  console.log('\n💾 Creating company transaction...');
  const transaction = await createCompanyTransaction({ cart, employee, company });
  console.log('✅ Transaction created:', transaction._id);
  console.log('   Total:', transaction.total);
  console.log('   Subtotal:', transaction.subtotal);
  console.log('   Tax:', transaction.tax);

  // Handle post-transaction success operations (creates schedule if needed)
  console.log('\n📅 Handling post-transaction operations...');
  await handleTransactionSuccess({ transaction, cart, employee });
  console.log('✅ Post-transaction operations completed');

  // Add placeholder customers to schedule AFTER schedule exists
  // This blocks spots immediately while waiting for customers to complete waivers
  console.log('\n👥 Adding placeholder customers to schedule...');
  await addPlaceholdersToSchedule({ transaction });
  console.log('✅ Placeholder customers added');

  // Create Stripe invoice for company payment
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              STRIPE INVOICE CREATION STARTING               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let invoice = null;
  try {
    // Get or create Stripe customer for the company
    console.log('🔍 Getting or creating Stripe customer for company...');
    console.log('   Company ID:', company._id);
    console.log('   Company Name:', company.name);
    console.log('   Company Email:', company.contactEmail);
    console.log('   Org Stripe Account:', org.stripeAccountId);

    const stripeCustomerId = await getOrCreateCompanyStripeCustomer({
      company,
      org
    });

    console.log('✅ Stripe customer ready:', stripeCustomerId);

    // Create invoice
    console.log('\n📄 Creating Stripe invoice...');
    invoice = await createCompanyInvoice({
      transaction,
      company,
      org,
      stripeCustomerId
    });

    console.log('\n✅ Invoice created successfully!');
    console.log('   Invoice ID:', invoice.id);
    console.log('   Invoice Status:', invoice.status);
    console.log('   Amount Due:', invoice.amount_due / 100);
    console.log('   Currency:', invoice.currency);
    console.log('   Hosted URL:', invoice.hosted_invoice_url);
    console.log('   Sent to:', company.contactEmail);
  } catch (error) {
    console.error('\n❌ INVOICE CREATION FAILED!');
    console.error('   Error Type:', error.constructor.name);
    console.error('   Error Message:', error.message);
    console.error('   Error Stack:', error.stack);
    console.error('\n⚠️ Transaction created but invoice failed. Staff can manually create invoice later.');
    // Don't fail the transaction if invoice creation fails
    // Staff can manually create invoice later
  }

  // Generate payment link for invoice
  let paymentLink = null;
  if (invoice) {
    try {
      console.log('\n🔗 Generating payment link...');
      const JWT_SECRET = new TextEncoder().encode(
        process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
      );

      const token = await new SignJWT({
        transactionId: transaction._id.toString(),
        orgId: employee.org._id.toString(),
        type: 'payment_link'
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('90d')
        .sign(JWT_SECRET);

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
      paymentLink = `${baseUrl}/pay/${transaction._id}?token=${token}`;

      console.log('✅ Payment link generated:', paymentLink);
    } catch (error) {
      console.error('❌ Failed to generate payment link:', error);
    }
  }

  // Generate waiver link and send email to company contact
  console.log('\n📧 Sending waiver email...');
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    const waiverLink = `${baseUrl}/schedule/${transaction._id}/waiver`;

    console.log('   Waiver Link:', waiverLink);
    console.log('   Payment Link:', paymentLink || 'No payment link');
    console.log('   Invoice URL:', invoice?.hosted_invoice_url || 'No invoice');
    console.log('   Recipient:', company.contactEmail);

    await sendCompanyWaiverEmail({
      company,
      org,
      waiverLink,
      transaction,
      invoiceUrl: invoice?.hosted_invoice_url,
      paymentLink
    });

    console.log('✅ Waiver link email sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send waiver link email:', error);
    console.error('   Error:', error.message);
    // Don't fail the transaction if email fails
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         COMPANY PAYMENT & INVOICE CREATION COMPLETE         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  return NextResponse.json({
    transaction,
    invoice: invoice ? {
      id: invoice.id,
      url: invoice.hosted_invoice_url,
      status: invoice.status,
      amount_due: invoice.amount_due / 100
    } : null
  }, { status: 200 });
}
