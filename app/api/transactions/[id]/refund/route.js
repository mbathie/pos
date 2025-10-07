import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Transaction, Org, Employee } from "@/models";
import { processRefund, getRefundSummary } from "@/lib/refunds";
import { isActionRestricted } from "@/lib/permissions";

export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { amount, reason, authorizerId, refundEmployeeId } = await req.json();

  try {
    // Check if refund action is restricted for this employee's role
    const restricted = isActionRestricted(employee.role, 'process_refund');
    let employeeIdForRefund = employee._id;

    if (restricted) {
      // If restricted, verify that an authorizer was provided
      if (!authorizerId) {
        return NextResponse.json({
          error: 'Manager authorization required for refunds'
        }, { status: 403 });
      }

      // Verify the authorizer exists and has proper permissions
      const authorizer = await Employee.findById(authorizerId);
      if (!authorizer) {
        return NextResponse.json({
          error: 'Invalid authorizer'
        }, { status: 403 });
      }

      // Verify authorizer is in same org and has permission
      if (authorizer.org.toString() !== employee.org._id.toString()) {
        return NextResponse.json({
          error: 'Authorizer must be from same organization'
        }, { status: 403 });
      }

      if (isActionRestricted(authorizer.role, 'process_refund')) {
        return NextResponse.json({
          error: 'Authorizer does not have refund permissions'
        }, { status: 403 });
      }

      console.log(`Refund authorized by ${authorizer.name} (${authorizer.role}) for employee ${employee.name} (${employee.role})`);

      // Use the authorizer's ID as the employee who processed the refund
      employeeIdForRefund = refundEmployeeId || authorizerId;
    }

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
      employeeId: employeeIdForRefund,
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
