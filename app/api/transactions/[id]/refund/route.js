import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Transaction, Org } from "@/models";
import { processRefund, getRefundSummary } from "@/lib/refunds";

export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { amount, reason } = await req.json();

  try {
    // Fetch transaction and verify ownership
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.org.toString() !== employee.org._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch organization for Stripe account
    const org = await Org.findById(employee.org._id);

    // Process the refund
    const result = await processRefund({
      transactionId: id,
      amount: parseFloat(amount),
      employeeId: employee._id,
      reason,
      org
    });

    // Get updated refund summary
    const refundSummary = getRefundSummary(result.transaction);

    return NextResponse.json({
      success: true,
      refund: result.refund,
      transaction: result.transaction,
      summary: refundSummary
    }, { status: 200 });

  } catch (error) {
    console.error('Refund error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Fetch transaction and verify ownership
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.org.toString() !== employee.org._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get refund summary
    const refundSummary = getRefundSummary(transaction);

    return NextResponse.json({
      summary: refundSummary
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching refund summary:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
