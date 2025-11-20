import Stripe from 'stripe';
import { Transaction } from '@/models';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Calculate due date based on payment terms
 * @param {string} paymentTerms - Payment terms (due_on_receipt, net_7, net_15, net_30, net_60)
 * @returns {number} - Unix timestamp for due date
 */
function calculateDueDate(paymentTerms) {
  const now = Math.floor(Date.now() / 1000);
  const daysMap = {
    'due_on_receipt': 0,
    'net_7': 7,
    'net_15': 15,
    'net_30': 30,
    'net_60': 60
  };

  const days = daysMap[paymentTerms] || 0;
  return now + (days * 24 * 60 * 60);
}

/**
 * Create a Stripe invoice for a company transaction
 * @param {Object} params
 * @param {Object} params.transaction - Transaction document
 * @param {Object} params.company - Company document
 * @param {Object} params.org - Organization document
 * @param {string} params.stripeCustomerId - Stripe customer ID for the company
 * @returns {Promise<Object>} - Stripe invoice object
 */
export async function createCompanyInvoice({ transaction, company, org, stripeCustomerId }) {
  console.log('📄 Creating Stripe invoice for transaction:', transaction._id);

  try {
    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      auto_advance: true, // Automatically finalize and send
      collection_method: 'send_invoice',
      days_until_due: getPaymentTermsDays(company.paymentTerms || 'due_on_receipt'),
      metadata: {
        transactionId: transaction._id.toString(),
        companyId: company._id.toString(),
        orgId: org._id.toString(),
        locationId: transaction.location?.toString() || ''
      },
      description: `Purchase from ${org.name}`,
      footer: transaction.company
        ? `Please complete waivers at: ${process.env.NEXT_PUBLIC_API_BASE_URL}/schedule/${transaction._id}/waiver`
        : undefined
    }, {
      stripeAccount: org.stripeAccountId
    });

    console.log('✅ Created invoice:', invoice.id);

    // Add line items from cart
    await addInvoiceLineItems({
      invoice,
      transaction,
      org
    });

    // Finalize and send the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(
      invoice.id,
      {
        auto_advance: true
      },
      {
        stripeAccount: org.stripeAccountId
      }
    );

    console.log('✅ Finalized and sent invoice:', finalizedInvoice.id);
    console.log('   Hosted invoice URL:', finalizedInvoice.hosted_invoice_url);

    // Update transaction with invoice details
    await Transaction.findByIdAndUpdate(transaction._id, {
      stripeInvoiceId: finalizedInvoice.id,
      invoiceStatus: finalizedInvoice.status,
      invoiceAmountPaid: finalizedInvoice.amount_paid / 100, // Convert from cents
      invoiceAmountDue: finalizedInvoice.amount_due / 100,
      invoiceUrl: finalizedInvoice.hosted_invoice_url
    });

    return finalizedInvoice;
  } catch (error) {
    console.error('❌ Failed to create invoice:', error);
    throw error;
  }
}

/**
 * Add line items to a Stripe invoice from transaction cart
 * @param {Object} params
 * @param {Object} params.invoice - Stripe invoice
 * @param {Object} params.transaction - Transaction document
 * @param {Object} params.org - Organization document
 */
async function addInvoiceLineItems({ invoice, transaction, org }) {
  const cart = transaction.cart;

  // Add each product as a line item
  for (const product of cart.products) {
    const unitAmount = Math.round((product.value || 0) * 100); // Convert to cents
    const quantity = product.qty || 1;

    await stripe.invoiceItems.create({
      customer: invoice.customer,
      invoice: invoice.id,
      amount: unitAmount,
      quantity: quantity,
      currency: 'aud',
      description: formatProductDescription(product),
      metadata: {
        productId: product._id?.toString() || '',
        productType: product.type || ''
      }
    }, {
      stripeAccount: org.stripeAccountId
    });
  }

  // Add discounts as negative line items
  if (transaction.adjustments?.discounts?.items?.length > 0) {
    for (const discount of transaction.adjustments.discounts.items) {
      await stripe.invoiceItems.create({
        customer: invoice.customer,
        invoice: invoice.id,
        amount: -Math.round(discount.amount * 100), // Negative for discount
        currency: 'aud',
        description: `Discount: ${discount.name}`,
        metadata: {
          discountId: discount.id?.toString() || '',
          type: 'discount'
        }
      }, {
        stripeAccount: org.stripeAccountId
      });
    }
  }

  // Add surcharges as positive line items
  if (transaction.adjustments?.surcharges?.items?.length > 0) {
    for (const surcharge of transaction.adjustments.surcharges.items) {
      await stripe.invoiceItems.create({
        customer: invoice.customer,
        invoice: invoice.id,
        amount: Math.round(surcharge.amount * 100),
        currency: 'aud',
        description: `Surcharge: ${surcharge.name}`,
        metadata: {
          surchargeId: surcharge.id?.toString() || '',
          type: 'surcharge'
        }
      }, {
        stripeAccount: org.stripeAccountId
      });
    }
  }

  // Add tax if applicable
  if (transaction.tax && transaction.tax > 0) {
    await stripe.invoiceItems.create({
      customer: invoice.customer,
      invoice: invoice.id,
      amount: Math.round(transaction.tax * 100),
      currency: 'aud',
      description: 'Tax',
      metadata: {
        type: 'tax'
      }
    }, {
      stripeAccount: org.stripeAccountId
    });
  }

  console.log('✅ Added line items to invoice');
}

/**
 * Format product description for invoice line item
 * @param {Object} product - Product from cart
 * @returns {string} - Formatted description
 */
function formatProductDescription(product) {
  let description = product.name;

  // Add type-specific details
  if (product.type === 'class' || product.type === 'course') {
    if (product.selectedTimes && product.selectedTimes.length > 0) {
      const times = product.selectedTimes.map(t => t.label || t.time).join(', ');
      description += ` (${times})`;
    }

    // Add participant details
    if (product.prices) {
      const participants = product.prices
        .filter(p => p.qty > 0)
        .map(p => `${p.qty}x ${p.name}`)
        .join(', ');
      if (participants) {
        description += ` - ${participants}`;
      }
    }
  }

  // Add variation if present
  if (product.variation) {
    description += ` - ${product.variation}`;
  }

  return description;
}

/**
 * Get payment terms in days
 * @param {string} paymentTerms - Payment terms string
 * @returns {number} - Number of days
 */
function getPaymentTermsDays(paymentTerms) {
  const daysMap = {
    'due_on_receipt': 0,
    'net_7': 7,
    'net_15': 15,
    'net_30': 30,
    'net_60': 60
  };

  return daysMap[paymentTerms] || 0;
}

/**
 * Handle invoice payment event from webhook
 * @param {Object} params
 * @param {Object} params.invoice - Stripe invoice from webhook
 * @param {string} params.stripeAccountId - Connected account ID
 */
export async function handleInvoicePayment({ invoice, stripeAccountId }) {
  const transactionId = invoice.metadata?.transactionId;

  if (!transactionId) {
    console.warn('⚠️ Invoice has no transaction ID in metadata:', invoice.id);
    return;
  }

  console.log('💰 Processing invoice payment for transaction:', transactionId);

  // Update transaction with payment details
  const updateData = {
    invoiceStatus: invoice.status,
    invoiceAmountPaid: invoice.amount_paid / 100,
    invoiceAmountDue: invoice.amount_due / 100
  };

  // If fully paid, mark transaction as completed
  if (invoice.status === 'paid') {
    updateData.status = 'completed';
    updateData.paymentMethod = 'invoice';
    console.log('✅ Invoice fully paid - marking transaction as completed');
  }

  await Transaction.findByIdAndUpdate(transactionId, updateData);

  console.log('✅ Updated transaction with invoice payment status');
}

/**
 * Handle invoice update event from webhook (for partial payments)
 * @param {Object} params
 * @param {Object} params.invoice - Stripe invoice from webhook
 * @param {string} params.stripeAccountId - Connected account ID
 */
export async function handleInvoiceUpdate({ invoice, stripeAccountId }) {
  const transactionId = invoice.metadata?.transactionId;

  if (!transactionId) {
    return;
  }

  console.log('📝 Updating invoice status for transaction:', transactionId);

  // Determine if partially paid
  let invoiceStatus = invoice.status;
  if (invoice.amount_paid > 0 && invoice.amount_due > 0) {
    invoiceStatus = 'partially_paid';
  }

  await Transaction.findByIdAndUpdate(transactionId, {
    invoiceStatus,
    invoiceAmountPaid: invoice.amount_paid / 100,
    invoiceAmountDue: invoice.amount_due / 100
  });

  console.log('✅ Updated transaction with partial payment:', {
    paid: invoice.amount_paid / 100,
    due: invoice.amount_due / 100
  });
}
