import Stripe from 'stripe';
import { Transaction } from '@/models';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Calculate the maximum refundable amount for a transaction
 * @param {Object} transaction - The transaction document
 * @returns {number} - Maximum refundable amount
 */
export function getMaxRefundableAmount(transaction) {
  const totalPaid = transaction.total || 0;
  const totalRefunded = (transaction.refunds || []).reduce((sum, refund) => sum + refund.amount, 0);
  return Math.max(0, totalPaid - totalRefunded);
}

/**
 * Get total refunded amount for a transaction
 * @param {Object} transaction - The transaction document
 * @returns {number} - Total refunded amount
 */
export function getTotalRefunded(transaction) {
  return (transaction.refunds || []).reduce((sum, refund) => sum + refund.amount, 0);
}

/**
 * Process a refund for a transaction
 * @param {Object} params
 * @param {string} params.transactionId - Transaction ID
 * @param {number} params.amount - Amount to refund
 * @param {string} params.employeeId - Employee processing the refund
 * @param {string} params.reason - Reason for refund (optional)
 * @param {Object} params.org - Organization object with stripeAccountId
 * @returns {Object} - Refund result with transaction and refund details
 */
export async function processRefund({ transactionId, amount, employeeId, reason, org }) {
  // Fetch the transaction
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // Validate refund amount
  const maxRefundable = getMaxRefundableAmount(transaction);
  if (amount <= 0) {
    throw new Error('Refund amount must be greater than 0');
  }
  if (amount > maxRefundable) {
    throw new Error(`Refund amount exceeds maximum refundable amount of $${maxRefundable.toFixed(2)}`);
  }

  const refundData = {
    date: new Date(),
    amount,
    employeeId,
    reason: reason || 'Refund processed',
    paymentMethod: transaction.paymentMethod
  };

  // Process Stripe refund for card payments (handle both 'card' and legacy 'stripe' payment methods)
  if ((transaction.paymentMethod === 'card' || transaction.paymentMethod === 'stripe') && transaction.stripePaymentIntentId) {
    try {
      const stripeOptions = org?.stripeAccountId
        ? { stripeAccount: org.stripeAccountId }
        : {};

      // Create Stripe refund
      const stripeRefund = await stripe.refunds.create({
        payment_intent: transaction.stripePaymentIntentId,
        amount: Math.round(amount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          transaction_id: transactionId,
          employee_id: employeeId,
          refund_reason: reason || 'Refund processed'
        }
      }, stripeOptions);

      // Add Stripe refund details
      refundData.stripeRefundId = stripeRefund.id;
      refundData.stripeStatus = stripeRefund.status;
      refundData.stripeChargeId = stripeRefund.charge;

    } catch (stripeError) {
      console.error('Stripe refund error:', stripeError);
      throw new Error(`Stripe refund failed: ${stripeError.message}`);
    }
  }

  // Update transaction with refund
  if (!transaction.refunds) {
    transaction.refunds = [];
  }
  transaction.refunds.push(refundData);

  // Mark transaction as refunded if fully refunded
  const totalRefunded = getTotalRefunded(transaction);
  if (totalRefunded >= transaction.total) {
    transaction.status = 'refunded';
  } else if (totalRefunded > 0) {
    transaction.status = 'partially_refunded';
  }

  await transaction.save();

  return {
    success: true,
    transaction,
    refund: refundData
  };
}

/**
 * Get refund summary for a transaction
 * @param {Object} transaction - The transaction document
 * @returns {Object} - Refund summary
 */
export function getRefundSummary(transaction) {
  const refunds = transaction.refunds || [];
  const totalRefunded = getTotalRefunded(transaction);
  const maxRefundable = getMaxRefundableAmount(transaction);

  return {
    totalRefunded,
    maxRefundable,
    refundCount: refunds.length,
    hasRefunds: refunds.length > 0,
    isFullyRefunded: maxRefundable === 0,
    isPartiallyRefunded: totalRefunded > 0 && maxRefundable > 0,
    refunds: refunds.map(r => ({
      ...r,
      formattedAmount: `$${r.amount.toFixed(2)}`,
      formattedDate: new Date(r.date).toLocaleDateString()
    }))
  };
}
