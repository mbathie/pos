import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Transaction } from '@/models';
import { sendTransactionReceipt } from '@/lib/email/receipt';

// This is a test route - remove authentication for testing purposes
// DO NOT USE IN PRODUCTION
export async function GET(req) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get('transactionId');
    const recipientEmail = searchParams.get('email') || 'test@example.com';
    
    if (!transactionId) {
      return NextResponse.json({
        error: 'Transaction ID is required'
      }, { status: 400 });
    }
    
    // Fetch the transaction with populated references
    const transaction = await Transaction.findById(transactionId)
      .populate('customer', 'name email phone memberId')
      .populate('employee', 'name')
      .populate('org', 'name email phone')
      .populate('location', 'name')
      .lean();
    
    if (!transaction) {
      return NextResponse.json({
        error: 'Transaction not found'
      }, { status: 404 });
    }
    
    // Send the receipt email
    const result = await sendTransactionReceipt({
      transaction,
      recipientEmail,
      org: transaction.org
    });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test receipt email sent to ${recipientEmail}`,
        messageId: result.messageId,
        previewUrl: result.previewUrl
      });
    } else {
      return NextResponse.json({
        error: `Failed to send email: ${result.error}`
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in test email receipt:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}