import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Transaction, Product } from '@/models';
import { getEmployee } from '@/lib/auth';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function PUT(request, { params }) {
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const { gId, productIds, groupQty } = await request.json();

    // Find the transaction
    const transaction = await Transaction.findById(id).populate('org');
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Only allow editing for company/invoice payments
    if (transaction.paymentMethod !== 'company' && transaction.paymentMethod !== 'invoice') {
      return NextResponse.json(
        { error: 'Can only edit groups for invoiced transactions' },
        { status: 400 }
      );
    }

    // Find all products with this gId in the cart
    const groupProducts = transaction.cart.products.filter(p => p.gId === gId);
    if (groupProducts.length === 0) {
      return NextResponse.json({ error: 'Group not found in transaction' }, { status: 404 });
    }

    // Get the group metadata from the first product
    const groupMetadata = {
      groupId: groupProducts[0].groupId,
      groupName: groupProducts[0].groupName,
      groupAmount: groupProducts[0].groupAmount,
      groupThumbnail: groupProducts[0].groupThumbnail,
    };

    // Fetch the new products
    const newProducts = await Product.find({ _id: { $in: productIds } });
    if (newProducts.length !== productIds.length) {
      return NextResponse.json({ error: 'Some products not found' }, { status: 404 });
    }

    // Calculate current group count based on groupQty from existing products
    const currentGroupQty = groupProducts[0].groupQty || 1;

    // Remove all existing products with this gId
    transaction.cart.products = transaction.cart.products.filter(p => p.gId !== gId);

    // Add the updated group products (groupQty times)
    for (let i = 0; i < groupQty; i++) {
      // Generate a new gId for each instance if we're changing quantity
      const newGId = i < currentGroupQty ?
        // Reuse existing gId for instances that already existed
        `${groupMetadata.groupId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}` :
        // Create new gId for new instances
        `${groupMetadata.groupId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`;

      // Add each selected product
      for (const product of newProducts) {
        const cartProduct = {
          _id: product._id,
          name: product.name,
          type: product.type,
          category: product.category,
          qty: product.type === 'class' || product.type === 'course' || product.type === 'membership' ? 0 : 1,
          stockQty: product.qty,
          value: product.value || 0,
          variations: product.variations || [],
          prices: product.prices || [],
          modGroups: product.modGroups || [],
          groupId: groupMetadata.groupId,
          gId: newGId,
          groupName: groupMetadata.groupName,
          groupAmount: groupMetadata.groupAmount,
          groupThumbnail: groupMetadata.groupThumbnail,
          groupQty: groupQty,
          isPartOfGroup: true,
          amount: {
            subtotal: 0 // Will be calculated when products are configured
          }
        };
        transaction.cart.products.push(cartProduct);
      }
    }

    // Recalculate transaction totals
    // Note: This is a simplified calculation - you may need to adjust based on your business logic
    let subtotal = 0;
    transaction.cart.products.forEach(product => {
      subtotal += (product.amount?.subtotal || 0);
    });

    transaction.subtotal = subtotal;
    transaction.total = subtotal + (transaction.tax || 0);

    // Save the transaction
    await transaction.save();

    // Update the Stripe invoice if it exists
    if (transaction.stripeInvoiceId && transaction.org?.stripeAccountId) {
      try {
        await updateStripeInvoice(transaction, transaction.org.stripeAccountId);
      } catch (invoiceError) {
        console.error('Error updating Stripe invoice:', invoiceError);
        // Continue even if invoice update fails - transaction is already saved
      }
    }

    // Fetch the updated transaction with populated fields
    const updatedTransaction = await Transaction.findById(id)
      .populate('customer')
      .populate('employee')
      .populate('location');

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json(
      { error: 'Failed to update group', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Update Stripe invoice with new line items
 */
async function updateStripeInvoice(transaction, stripeAccountId) {
  try {
    const invoice = await stripe.invoices.retrieve(
      transaction.stripeInvoiceId,
      { stripeAccount: stripeAccountId }
    );

    // If invoice is already paid or finalized, we need to void it and create a new one
    if (invoice.status === 'paid' || invoice.status === 'open') {
      console.log('Invoice is finalized/paid - creating credit note or voiding');
      // For now, just log - you may want to create a credit note or void the invoice
      // and create a new one depending on your business requirements
      return;
    }

    // If invoice is still in draft, we can update it
    if (invoice.status === 'draft') {
      // Delete existing line items
      const lineItems = invoice.lines.data;
      for (const item of lineItems) {
        await stripe.invoiceItems.del(item.id, { stripeAccount: stripeAccountId });
      }

      // Add new line items
      for (const product of transaction.cart.products) {
        const unitAmount = Math.round((product.amount?.subtotal || 0) * 100);

        await stripe.invoiceItems.create({
          customer: invoice.customer,
          invoice: invoice.id,
          amount: unitAmount,
          currency: 'aud',
          description: product.name,
          metadata: {
            productId: product._id?.toString() || '',
            productType: product.type || '',
            gId: product.gId || ''
          }
        }, {
          stripeAccount: stripeAccountId
        });
      }

      // Update invoice totals
      await stripe.invoices.update(
        invoice.id,
        {
          metadata: {
            ...invoice.metadata,
            lastUpdated: new Date().toISOString()
          }
        },
        { stripeAccount: stripeAccountId }
      );
    }
  } catch (error) {
    console.error('Error updating Stripe invoice:', error);
    throw error;
  }
}
