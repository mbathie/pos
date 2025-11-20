import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { createCompanyTransaction, handleTransactionSuccess, addPlaceholdersToSchedule } from '@/lib/payments/success'
import { sendCompanyWaiverEmail } from '@/lib/email/company-waiver';
import { getOrCreateCompanyStripeCustomer } from '@/lib/stripe/company-customer';
import { createCompanyInvoice } from '@/lib/stripe/invoice';
import { Org } from '@/models';

export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const { cart, company, paymentType } = await req.json();

  if (!company || !company._id) {
    return NextResponse.json({
      error: 'Company information is required for company payments'
    }, { status: 400 });
  }

  // Get organization details
  const org = await Org.findById(employee.org._id);

  // Create the company transaction (zero payment upfront)
  const transaction = await createCompanyTransaction({ cart, employee, company });

  // Handle post-transaction success operations (creates schedule if needed)
  await handleTransactionSuccess({ transaction, cart, employee });

  // Add placeholder customers to schedule AFTER schedule exists
  // This blocks spots immediately while waiting for customers to complete waivers
  await addPlaceholdersToSchedule({ transaction });

  // Create Stripe invoice for company payment
  let invoice = null;
  try {
    // Get or create Stripe customer for the company
    const stripeCustomerId = await getOrCreateCompanyStripeCustomer({
      company,
      org
    });

    // Create invoice
    invoice = await createCompanyInvoice({
      transaction,
      company,
      org,
      stripeCustomerId
    });

    console.log('✅ Invoice created and sent to:', company.contactEmail);
    console.log('   Invoice URL:', invoice.hosted_invoice_url);
  } catch (error) {
    console.error('❌ Failed to create invoice:', error);
    // Don't fail the transaction if invoice creation fails
    // Staff can manually create invoice later
  }

  // Generate waiver link and send email to company contact
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    const waiverLink = `${baseUrl}/schedule/${transaction._id}/waiver`;

    await sendCompanyWaiverEmail({
      company,
      org,
      waiverLink,
      transaction,
      invoiceUrl: invoice?.hosted_invoice_url
    });

    console.log('✅ Waiver link email sent to:', company.contactEmail);
  } catch (error) {
    console.error('❌ Failed to send waiver link email:', error);
    // Don't fail the transaction if email fails
  }

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
