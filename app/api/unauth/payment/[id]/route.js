import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Transaction } from '@/models';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
);

/**
 * GET /api/unauth/payment/[id]?token=xxx
 * Fetch transaction payment information using secure token
 */
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ message: 'Payment link token required' }, { status: 401 });
    }

    // Verify token
    let payload;
    try {
      const { payload: decoded } = await jwtVerify(token, JWT_SECRET);
      payload = decoded;
    } catch (error) {
      return NextResponse.json({ message: 'Invalid or expired payment link' }, { status: 401 });
    }

    // Check if token is for this transaction
    if (payload.transactionId !== id) {
      return NextResponse.json({ message: 'Invalid payment link' }, { status: 401 });
    }

    // Fetch transaction
    const transaction = await Transaction.findById(id)
      .populate('org', 'name email logo minInvoicePaymentPercent')
      .populate('company', 'name email')
      .lean();

    if (!transaction) {
      return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
    }

    // Verify this is an invoice transaction
    if (!transaction.stripeInvoiceId) {
      return NextResponse.json({ message: 'This transaction does not have an invoice' }, { status: 400 });
    }

    // Calculate minimum payment amount based on org setting
    const minPaymentPercent = transaction.org?.minInvoicePaymentPercent ?? 50;
    const amountDue = transaction.invoiceAmountDue || transaction.total;
    const minPaymentAmount = (transaction.total * minPaymentPercent) / 100;
    // If amount already paid covers the minimum, allow any amount
    const effectiveMinPayment = (transaction.invoiceAmountPaid || 0) >= minPaymentAmount
      ? 0.01  // Allow any amount if minimum already met
      : Math.max(0.01, minPaymentAmount - (transaction.invoiceAmountPaid || 0));

    // Return transaction info
    return NextResponse.json({
      transaction: {
        _id: transaction._id,
        total: transaction.total,
        subtotal: transaction.subtotal,
        tax: transaction.tax,
        invoiceAmountPaid: transaction.invoiceAmountPaid || 0,
        invoiceAmountDue: amountDue,
        invoiceStatus: transaction.invoiceStatus,
        invoiceUrl: transaction.invoiceUrl,
        org: transaction.org,
        company: transaction.company,
        createdAt: transaction.createdAt,
        minPaymentPercent,
        minPaymentAmount: Math.min(effectiveMinPayment, amountDue) // Can't exceed what's due
      }
    });

  } catch (error) {
    console.error('Error fetching payment info:', error);
    return NextResponse.json(
      { message: 'Failed to load payment information' },
      { status: 500 }
    );
  }
}
