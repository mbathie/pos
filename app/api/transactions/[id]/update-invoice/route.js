import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { Transaction } from '@/models';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * PATCH /api/transactions/[id]/update-invoice
 * Update a Stripe invoice with a differential amount (positive or negative)
 */
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { employee } = await getEmployee();

    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { differentialAmount } = await request.json();

    console.log('📝 Updating invoice for transaction:', id);
    console.log('💰 Differential amount:', differentialAmount);

    // Fetch transaction
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Verify transaction has an invoice
    if (!transaction.stripeInvoiceId) {
      return NextResponse.json({ error: 'Transaction does not have an invoice' }, { status: 400 });
    }

    // Verify transaction payment method is invoice or company
    if (transaction.paymentMethod !== 'invoice' && transaction.paymentMethod !== 'company') {
      return NextResponse.json({ error: 'Transaction is not an invoice' }, { status: 400 });
    }

    const org = employee.org;
    if (!org.stripeAccountId) {
      return NextResponse.json({ error: 'Organization does not have Stripe connected' }, { status: 400 });
    }

    // Fetch the existing invoice from Stripe
    const invoice = await stripe.invoices.retrieve(
      transaction.stripeInvoiceId,
      { stripeAccount: org.stripeAccountId }
    );

    console.log('📄 Current invoice status:', invoice.status);

    // Check if invoice can be updated
    if (invoice.status === 'paid' || invoice.status === 'void') {
      return NextResponse.json({
        error: `Cannot update invoice with status: ${invoice.status}`
      }, { status: 400 });
    }

    // If invoice is already finalized (sent), void it and create a new one
    if (invoice.status === 'open') {
      console.log('🔄 Invoice is finalized - voiding and creating new invoice with adjustments');

      const amountPaid = invoice.amount_paid || 0; // Amount already paid in cents
      const originalInvoiceTotal = invoice.total / 100; // Original invoice total in dollars
      const newTotal = originalInvoiceTotal + differentialAmount; // New total in dollars
      const newTotalCents = Math.round(newTotal * 100);

      console.log('💰 Original invoice total:', originalInvoiceTotal);
      console.log('💰 Amount already paid:', amountPaid / 100);
      console.log('💰 Differential:', differentialAmount);
      console.log('💰 New total:', newTotal);

      // Void the original invoice
      const voidedInvoice = await stripe.invoices.voidInvoice(
        invoice.id,
        { stripeAccount: org.stripeAccountId }
      );

      console.log('✅ Voided original invoice:', invoice.id);

      // Create the new invoice (in draft state)
      const newInvoice = await stripe.invoices.create({
        customer: invoice.customer,
        auto_advance: false, // Keep as draft so we can add items
        collection_method: 'send_invoice',
        days_until_due: invoice.days_until_due || 30,
        metadata: {
          originalInvoiceId: invoice.id,
          transactionId: transaction._id.toString(),
          voidedInvoiceId: invoice.id
        },
        description: `Revised invoice (replaces ${invoice.number || invoice.id})`,
        footer: invoice.footer
      }, {
        stripeAccount: org.stripeAccountId
      });

      console.log('✅ Created new invoice:', newInvoice.id);

      // Add invoice item to the new invoice
      await stripe.invoiceItems.create({
        customer: invoice.customer,
        invoice: newInvoice.id, // Attach to the specific invoice
        amount: newTotalCents,
        currency: invoice.currency, // Use the same currency as the original invoice
        description: `Adjusted invoice (originally ${invoice.number || invoice.id})`,
        metadata: {
          originalInvoiceId: invoice.id,
          transactionId: transaction._id.toString(),
          adjustmentType: 'group_modification'
        }
      }, {
        stripeAccount: org.stripeAccountId
      });

      console.log('✅ Created invoice item for new total:', newTotal);

      // If there was a payment on the old invoice, apply it as a credit to the new invoice
      if (amountPaid > 0) {
        console.log('💳 Applying credit for previous payment:', amountPaid / 100);

        // Create a credit note for the voided invoice
        const creditNote = await stripe.creditNotes.create({
          invoice: invoice.id,
          lines: [{
            type: 'custom_line_item',
            description: 'Payment transferred to revised invoice',
            amount: amountPaid,
            unit_amount: amountPaid,
            quantity: 1
          }],
          memo: `Credit applied to revised invoice ${newInvoice.number || newInvoice.id}`,
          metadata: {
            newInvoiceId: newInvoice.id,
            transactionId: transaction._id.toString()
          }
        }, {
          stripeAccount: org.stripeAccountId
        });

        console.log('✅ Created credit note:', creditNote.id);

        // Apply the credit to the customer's balance
        // (Stripe will automatically apply customer balance to new invoices)
      }

      // Finalize and send the new invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(
        newInvoice.id,
        { auto_advance: true },
        { stripeAccount: org.stripeAccountId }
      );

      console.log('✅ Finalized new invoice');

      // Update transaction with new invoice info
      await Transaction.findByIdAndUpdate(id, {
        stripeInvoiceId: finalizedInvoice.id,
        invoiceUrl: finalizedInvoice.hosted_invoice_url,
        invoiceStatus: finalizedInvoice.status,
        invoiceAmountDue: finalizedInvoice.amount_due / 100,
        invoiceAmountPaid: finalizedInvoice.amount_paid / 100,
        total: newTotal,
        subtotal: transaction.subtotal + differentialAmount,
        voidedInvoiceId: invoice.id // Keep track of the voided invoice
      });

      console.log('✅ Invoice adjustment completed');
      console.log('   New invoice URL:', finalizedInvoice.hosted_invoice_url);
      console.log('   Amount due on new invoice:', finalizedInvoice.amount_due / 100);

      return NextResponse.json({
        success: true,
        invoice: finalizedInvoice,
        voidedInvoice: voidedInvoice,
        creditApplied: amountPaid / 100,
        message: 'Invoice updated successfully',
        invoiceUrl: finalizedInvoice.hosted_invoice_url
      });
    } else if (invoice.status === 'draft') {
      console.log('📝 Invoice is still draft - adding line item');

      // Add an invoice item for the differential amount
      const description = differentialAmount > 0
        ? 'Additional charges'
        : 'Refund/Credit for removed items';

      await stripe.invoiceItems.create({
        customer: invoice.customer,
        invoice: invoice.id,
        amount: Math.round(differentialAmount * 100), // Convert to cents
        currency: 'usd',
        description: description
      }, {
        stripeAccount: org.stripeAccountId
      });

      // Finalize the invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(
        invoice.id,
        { auto_advance: true },
        { stripeAccount: org.stripeAccountId }
      );

      // Update transaction
      await Transaction.findByIdAndUpdate(id, {
        invoiceAmountDue: finalizedInvoice.amount_due / 100,
        total: finalizedInvoice.total / 100,
        subtotal: finalizedInvoice.subtotal / 100,
        tax: finalizedInvoice.tax / 100,
        invoiceStatus: finalizedInvoice.status
      });

      console.log('✅ Invoice finalized and updated');

      return NextResponse.json({
        success: true,
        invoice: finalizedInvoice,
        message: 'Invoice updated and finalized successfully'
      });
    }

  } catch (error) {
    console.error('❌ Error updating invoice:', error);
    return NextResponse.json({
      error: 'Failed to update invoice',
      message: error.message
    }, { status: 500 });
  }
}
