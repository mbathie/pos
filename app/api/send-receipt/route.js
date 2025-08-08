import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Transaction } from "@/models";
import { sendTransactionReceipt } from "@/lib/email/receipt";

export async function POST(req) {
  try {
    await connectDB();

    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, transactionId } = await req.json();

    if (!email || !transactionId) {
      return NextResponse.json(
        { error: "Email and transaction ID are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Fetch the transaction with populated references
    const transaction = await Transaction.findById(transactionId)
      .populate('customer', 'name email phone memberId')
      .populate('employee', 'name')
      .populate('org', 'name email phone')
      .populate('location', 'name')
      .lean();

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Verify the transaction belongs to the same organization
    if (transaction.org._id.toString() !== employee.org._id.toString()) {
      return NextResponse.json(
        { error: "Unauthorized to access this transaction" },
        { status: 403 }
      );
    }

    // Send the receipt email in the background (non-blocking)
    sendTransactionReceipt({
      transaction,
      recipientEmail: email,
      org: transaction.org
    }).then(result => {
      if (result.success) {
        console.log(`📧 Receipt sent to ${email} for transaction ${transactionId}`);
        console.log(`   Preview URL: ${result.previewUrl}`);
      } else {
        console.error(`❌ Failed to send receipt to ${email}:`, result.error);
      }
    }).catch(error => {
      console.error(`❌ Background email send failed for ${email}:`, error);
    });

    // Return success immediately (email will be sent in background)
    return NextResponse.json({
      success: true,
      message: `Receipt is being sent to ${email}`,
      queued: true
    });
  } catch (error) {
    console.error("Error sending receipt:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}