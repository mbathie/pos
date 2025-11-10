import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { createCompanyTransaction, handleTransactionSuccess, addPlaceholdersToSchedule } from '@/lib/payments/success'
import { sendCompanyWaiverEmail } from '@/lib/email/company-waiver';
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

  // Create the company transaction (zero payment upfront)
  const transaction = await createCompanyTransaction({ cart, employee, company });

  // Handle post-transaction success operations (creates schedule if needed)
  await handleTransactionSuccess({ transaction, cart, employee });

  // Add placeholder customers to schedule AFTER schedule exists
  // This blocks spots immediately while waiting for customers to complete waivers
  await addPlaceholdersToSchedule({ transaction });

  // Generate waiver link and send email to company contact
  try {
    const org = await Org.findById(employee.org._id);
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    const waiverLink = `${baseUrl}/schedule/${transaction._id}/waiver`;

    await sendCompanyWaiverEmail({
      company,
      org,
      waiverLink,
      transaction
    });

    console.log('✅ Waiver link email sent to:', company.contactEmail);
  } catch (error) {
    console.error('❌ Failed to send waiver link email:', error);
    // Don't fail the transaction if email fails
  }

  return NextResponse.json({ transaction }, { status: 200 });
}
