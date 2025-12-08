import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { createCompanyTransaction, createCustomerInvoiceTransaction, handleTransactionSuccess, addPlaceholdersToSchedule } from '@/lib/payments/success'
import { sendCompanyWaiverEmail } from '@/lib/email/company-waiver';
import { sendInvoiceEmail } from '@/lib/email/invoice';
import { getOrCreateCompanyStripeCustomer, getOrCreateCustomerStripeCustomer } from '@/lib/stripe/company-customer';
import { createCompanyInvoice } from '@/lib/stripe/invoice';
import { Org } from '@/models';
import { SignJWT } from 'jose';

export async function POST(req, { params }) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         GROUP INVOICE PAYMENT CREATION STARTED              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  await connectDB();

  const { employee } = await getEmployee();
  const { cart, company, customer, paymentType } = await req.json();

  // Determine if this is a company or customer invoice
  const isCustomerInvoice = paymentType === 'customer-invoice';
  const payer = isCustomerInvoice ? customer : company;
  const payerEmail = isCustomerInvoice ? customer?.email : company?.contactEmail;
  const payerName = isCustomerInvoice ? customer?.name : company?.name;

  console.log('📋 Request Details:');
  console.log('   Employee:', employee.email);
  console.log('   Organization ID:', employee.org._id);
  console.log('   Payment Type:', paymentType);
  console.log('   Is Customer Invoice:', isCustomerInvoice);
  if (isCustomerInvoice) {
    console.log('   Customer ID:', customer?._id);
    console.log('   Customer Name:', customer?.name);
    console.log('   Customer Email:', customer?.email);
  } else {
    console.log('   Company ID:', company?._id);
    console.log('   Company Name:', company?.name);
    console.log('   Company Email:', company?.contactEmail);
  }
  console.log('   Cart Total:', cart?.total);
  console.log('   Cart Products:', cart?.products?.length);

  // Validate that we have either a company or customer
  if (isCustomerInvoice) {
    if (!customer || !customer._id) {
      console.error('❌ Customer information missing!');
      return NextResponse.json({
        error: 'Customer information is required for customer invoice payments'
      }, { status: 400 });
    }
  } else {
    if (!company || !company._id) {
      console.error('❌ Company information missing!');
      return NextResponse.json({
        error: 'Company information is required for company payments'
      }, { status: 400 });
    }
  }

  console.log('\n🔍 Fetching organization details...');
  const org = await Org.findById(employee.org._id);
  console.log('✅ Organization found:', org.name);
  console.log('   Stripe Account ID:', org.stripeAccountId || '⚠️ MISSING');

  // Create the transaction (zero payment upfront)
  console.log('\n💾 Creating transaction...');
  let transaction;
  if (isCustomerInvoice) {
    transaction = await createCustomerInvoiceTransaction({ cart, employee, customer });
  } else {
    transaction = await createCompanyTransaction({ cart, employee, company });
  }
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

  // Create Stripe invoice for payment
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              STRIPE INVOICE CREATION STARTING               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let invoice = null;
  try {
    // Get or create Stripe customer for the payer
    console.log('🔍 Getting or creating Stripe customer...');
    console.log('   Payer ID:', payer._id);
    console.log('   Payer Name:', payerName);
    console.log('   Payer Email:', payerEmail);
    console.log('   Org Stripe Account:', org.stripeAccountId);

    let stripeCustomerId;
    if (isCustomerInvoice) {
      stripeCustomerId = await getOrCreateCustomerStripeCustomer({
        customer,
        org
      });
    } else {
      stripeCustomerId = await getOrCreateCompanyStripeCustomer({
        company,
        org
      });
    }

    console.log('✅ Stripe customer ready:', stripeCustomerId);

    // Create invoice
    console.log('\n📄 Creating Stripe invoice...');
    invoice = await createCompanyInvoice({
      transaction,
      company: isCustomerInvoice ? null : company,
      customer: isCustomerInvoice ? customer : null,
      org,
      stripeCustomerId
    });

    console.log('\n✅ Invoice created successfully!');
    console.log('   Invoice ID:', invoice.id);
    console.log('   Invoice Status:', invoice.status);
    console.log('   Amount Due:', invoice.amount_due / 100);
    console.log('   Currency:', invoice.currency);
    console.log('   Hosted URL:', invoice.hosted_invoice_url);
    console.log('   Sent to:', payerEmail);
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

  // Check if any products require a waiver
  const hasWaiverRequired = cart?.products?.some(p => p.waiverRequired === true) || false;
  console.log('\n📋 Waiver check:');
  console.log('   Has waiver required products:', hasWaiverRequired);

  // Send appropriate email based on waiver requirements
  console.log('\n📧 Sending email...');
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

    if (hasWaiverRequired) {
      // Send waiver + invoice email
      const waiverLink = `${baseUrl}/schedule/${transaction._id}/waiver`;
      console.log('   Email type: Waiver + Invoice');
      console.log('   Waiver Link:', waiverLink);
      console.log('   Payment Link:', paymentLink || 'No payment link');
      console.log('   Invoice URL:', invoice?.hosted_invoice_url || 'No invoice');
      console.log('   Recipient:', payerEmail);

      await sendCompanyWaiverEmail({
        company: isCustomerInvoice ? null : company,
        customer: isCustomerInvoice ? customer : null,
        org,
        waiverLink,
        transaction,
        invoiceUrl: invoice?.hosted_invoice_url,
        paymentLink
      });

      console.log('✅ Waiver link email sent successfully!');
    } else {
      // Send invoice-only email (no waiver required)
      console.log('   Email type: Invoice only (no waiver)');
      console.log('   Payment Link:', paymentLink || 'No payment link');
      console.log('   Invoice URL:', invoice?.hosted_invoice_url || 'No invoice');
      console.log('   Recipient:', payerEmail);

      await sendInvoiceEmail({
        company: isCustomerInvoice ? null : company,
        customer: isCustomerInvoice ? customer : null,
        org,
        transaction,
        invoiceUrl: invoice?.hosted_invoice_url,
        paymentLink
      });

      console.log('✅ Invoice email sent successfully!');
    }
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    console.error('   Error:', error.message);
    // Don't fail the transaction if email fails
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         GROUP INVOICE PAYMENT CREATION COMPLETE             ║');
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
