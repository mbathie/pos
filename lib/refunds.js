import Stripe from 'stripe';
import { Transaction, Order, Schedule } from '@/models';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Cancel orders associated with a transaction
 * @param {string} transactionId - Transaction ID
 * @returns {Object} - Result with count of cancelled orders
 */
async function cancelOrdersForTransaction(transactionId) {
  const result = await Order.updateMany(
    { transaction: transactionId, status: { $ne: 'cancelled' } },
    { $set: { status: 'cancelled' } }
  );

  console.log(`🗑️ Cancelled ${result.modifiedCount} order(s) for transaction ${transactionId}`);
  return { cancelledCount: result.modifiedCount };
}

/**
 * Cancel schedule enrollments (class/course bookings) associated with a transaction
 * @param {string} transactionId - Transaction ID
 * @returns {Object} - Result with count of cancelled enrollments
 */
async function cancelScheduleEnrollmentsForTransaction(transactionId) {
  // Find all schedules that have customers with this transaction
  const schedules = await Schedule.find({
    'locations.classes.customers.transaction': transactionId
  });

  let cancelledCount = 0;

  for (const schedule of schedules) {
    let modified = false;

    for (const location of schedule.locations) {
      for (const classSession of location.classes) {
        for (const customer of classSession.customers) {
          if (customer.transaction?.toString() === transactionId.toString() &&
              customer.status !== 'cancelled') {
            customer.status = 'cancelled';
            cancelledCount++;
            modified = true;
          }
        }
      }
    }

    if (modified) {
      await schedule.save();
    }
  }

  console.log(`📅 Cancelled ${cancelledCount} schedule enrollment(s) for transaction ${transactionId}`);
  return { cancelledCount };
}

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
 * @param {string} params.refundMethod - Refund method override ('cash' or 'card')
 * @returns {Object} - Refund result with transaction and refund details
 */
export async function processRefund({ transactionId, amount, employeeId, reason, org, refundMethod }) {
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

  // Determine refund method: use override if provided, otherwise match original payment
  const effectiveRefundMethod = refundMethod || transaction.paymentMethod;

  const refundData = {
    date: new Date(),
    amount,
    employeeId,
    reason: reason || 'Refund processed',
    paymentMethod: effectiveRefundMethod
  };

  console.log('🔍 Refund check:', {
    originalPaymentMethod: transaction.paymentMethod,
    refundMethod: effectiveRefundMethod,
    hasPaymentIntentId: !!transaction.stripePaymentIntentId,
    paymentIntentId: transaction.stripePaymentIntentId,
    willProcessStripe: effectiveRefundMethod === 'card' && !!transaction.stripePaymentIntentId
  });

  // Process Stripe refund only if refunding to card
  if (effectiveRefundMethod === 'card' && transaction.stripePaymentIntentId) {
    console.log('💳 Processing Stripe refund...');
    try {
      const stripeOptions = org?.stripeAccountId
        ? { stripeAccount: org.stripeAccountId }
        : {};

      console.log('📤 Creating Stripe refund:', {
        payment_intent: transaction.stripePaymentIntentId,
        amount: Math.round(amount * 100),
        stripeAccount: org?.stripeAccountId
      });

      // Create Stripe refund
      const stripeRefund = await stripe.refunds.create({
        payment_intent: transaction.stripePaymentIntentId,
        amount: Math.round(amount * 100), // Convert to cents
        reason: 'requested_by_customer',
        metadata: {
          transaction_id: transactionId.toString(),
          employee_id: employeeId.toString(),
          refund_reason: reason || 'Refund processed'
        }
      }, stripeOptions);

      console.log('✅ Stripe refund created:', {
        id: stripeRefund.id,
        status: stripeRefund.status,
        amount: stripeRefund.amount
      });

      // Add Stripe refund details
      refundData.stripeRefundId = stripeRefund.id;
      refundData.stripeStatus = stripeRefund.status;
      refundData.stripeChargeId = stripeRefund.charge;

    } catch (stripeError) {
      console.error('❌ Stripe refund error:', stripeError);
      console.error('Error details:', {
        type: stripeError.type,
        code: stripeError.code,
        message: stripeError.message
      });
      throw new Error(`Stripe refund failed: ${stripeError.message}`);
    }
  } else {
    console.log('⏭️ Skipping Stripe refund (cash transaction or no payment intent)');
  }

  // Update transaction with refund
  if (!transaction.refunds) {
    transaction.refunds = [];
  }
  transaction.refunds.push(refundData);

  // Mark transaction as refunded if fully refunded
  const totalRefunded = getTotalRefunded(transaction);
  const isFullRefund = totalRefunded >= transaction.total;

  if (isFullRefund) {
    transaction.status = 'refunded';
  } else if (totalRefunded > 0) {
    transaction.status = 'partially_refunded';
  }

  await transaction.save();

  // For full refunds, cancel associated orders and schedule enrollments
  let cleanupResults = null;
  if (isFullRefund) {
    console.log('🧹 Full refund - cleaning up associated records...');

    const [ordersResult, schedulesResult] = await Promise.all([
      cancelOrdersForTransaction(transactionId),
      cancelScheduleEnrollmentsForTransaction(transactionId)
    ]);

    cleanupResults = {
      ordersCancelled: ordersResult.cancelledCount,
      enrollmentsCancelled: schedulesResult.cancelledCount
    };

    console.log('✅ Cleanup complete:', cleanupResults);
  }

  return {
    success: true,
    transaction,
    refund: refundData,
    cleanup: cleanupResults
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
    refunds: refunds.map(r => {
      // Convert Mongoose document to plain object if needed
      const refund = r.toObject ? r.toObject() : r;
      return {
        ...refund,
        amount: refund.amount,
        formattedAmount: `$${refund.amount.toFixed(2)}`,
        formattedDate: new Date(refund.date).toLocaleDateString()
      };
    })
  };
}
