import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Transaction } from '@/models';
import Stripe from 'stripe';
import { jwtVerify } from 'jose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
);

/**
 * POST /api/unauth/payment/[id]/checkout
 * Create Stripe Checkout session for partial payment
 */
export async function POST(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const { amount, token } = await request.json();

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

    // Validate amount
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return NextResponse.json({ message: 'Invalid payment amount' }, { status: 400 });
    }

    // Fetch transaction
    const transaction = await Transaction.findById(id)
      .populate('org', 'name stripeAccountId')
      .populate('company', 'name email')
      .lean();

    if (!transaction) {
      return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
    }

    // Verify this is an invoice transaction
    if (!transaction.stripeInvoiceId) {
      return NextResponse.json({ message: 'This transaction does not have an invoice' }, { status: 400 });
    }

    // Check amount doesn't exceed remaining balance
    const remainingBalance = transaction.invoiceAmountDue || transaction.total;
    if (paymentAmount > remainingBalance) {
      return NextResponse.json({
        message: `Amount cannot exceed remaining balance of $${remainingBalance.toFixed(2)}`
      }, { status: 400 });
    }

    if (!transaction.org?.stripeAccountId) {
      return NextResponse.json({ message: 'Organization does not have Stripe connected' }, { status: 400 });
    }

    // Get or create Stripe customer for the company
    let stripeCustomerId = transaction.company?.stripeCustomerId;

    if (!stripeCustomerId) {
      // This shouldn't happen as customer should have been created during invoice creation
      // But as a fallback, we'll use the invoice's customer
      const invoice = await stripe.invoices.retrieve(
        transaction.stripeInvoiceId,
        { stripeAccount: transaction.org.stripeAccountId }
      );
      stripeCustomerId = invoice.customer;
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: stripeCustomerId,
      line_items: [{
        price_data: {
          currency: 'aud',
          product_data: {
            name: `Payment for Invoice #${transaction._id.toString().slice(-8).toUpperCase()}`,
            description: `${transaction.company?.name || 'Company'} - ${transaction.org.name}`,
          },
          unit_amount: Math.round(paymentAmount * 100), // Convert to cents
        },
        quantity: 1,
      }],
      payment_intent_data: {
        metadata: {
          transactionId: transaction._id.toString(),
          invoiceId: transaction.stripeInvoiceId,
          paymentType: 'partial_invoice_payment',
          companyId: transaction.company?._id?.toString() || '',
          orgId: transaction.org._id.toString()
        }
      },
      metadata: {
        transactionId: transaction._id.toString(),
        invoiceId: transaction.stripeInvoiceId,
        paymentType: 'partial_invoice_payment'
      },
      success_url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/pay/${id}/success?session_id={CHECKOUT_SESSION_ID}&token=${token}`,
      cancel_url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/pay/${id}?token=${token}`,
    }, {
      stripeAccount: transaction.org.stripeAccountId
    });

    console.log('✅ Created Checkout session:', session.id, 'for amount:', paymentAmount);

    return NextResponse.json({
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
