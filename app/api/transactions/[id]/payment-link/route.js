import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { Transaction } from '@/models';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
);

/**
 * POST /api/transactions/[id]/payment-link
 * Generate a secure payment link for a transaction
 */
export async function POST(request, { params }) {
  try {
    await connectDB();
    const { employee } = await getEmployee();

    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch transaction
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Verify transaction belongs to this org
    if (transaction.org.toString() !== employee.org._id.toString()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify transaction has an invoice
    if (!transaction.stripeInvoiceId) {
      return NextResponse.json({ error: 'Transaction does not have an invoice' }, { status: 400 });
    }

    // Verify transaction is not fully paid
    if (transaction.invoiceStatus === 'paid') {
      return NextResponse.json({ error: 'Invoice is already paid in full' }, { status: 400 });
    }

    // Generate JWT token for payment link (expires in 90 days)
    const token = await new SignJWT({
      transactionId: id,
      orgId: employee.org._id.toString(),
      type: 'payment_link'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('90d')
      .sign(JWT_SECRET);

    // Generate payment URL
    const paymentUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/pay/${id}?token=${token}`;

    return NextResponse.json({
      success: true,
      paymentUrl,
      token
    });

  } catch (error) {
    console.error('Error generating payment link:', error);
    return NextResponse.json(
      { error: 'Failed to generate payment link', message: error.message },
      { status: 500 }
    );
  }
}
