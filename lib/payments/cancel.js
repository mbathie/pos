import Stripe from 'stripe';
import { Membership, Customer, Org, Product } from '@/models';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Calculate the minimum cancellation date based on minContract
 * @param {Date} startDate - Subscription start date
 * @param {string} billingFrequency - Billing frequency (weekly, fortnightly, monthly, yearly)
 * @param {number} minContract - Minimum number of billing cycles
 * @returns {Date} Minimum cancellation date
 */
function calculateMinCancellationDate(startDate, billingFrequency, minContract) {
  if (!minContract || minContract <= 0) {
    return null;
  }

  const date = new Date(startDate);

  switch (billingFrequency) {
    case 'weekly':
      date.setDate(date.getDate() + (minContract * 7));
      break;
    case 'fortnightly':
      date.setDate(date.getDate() + (minContract * 14));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + minContract);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + minContract);
      break;
    default:
      return null;
  }

  return date;
}

/**
 * Cancel a membership subscription at the end of the current billing period
 * @param {Object} params - Cancellation parameters
 * @param {string} params.membershipId - Membership ID
 * @param {string} params.employeeId - Employee ID who initiated the cancellation
 * @param {string} params.reason - Optional reason for cancellation
 * @returns {Object} Updated membership
 */
export async function cancelMembership({
  membershipId,
  employeeId,
  reason
}) {
  console.log('=== CANCEL MEMBERSHIP START ===');
  console.log('Input params:', {
    membershipId,
    employeeId,
    reason
  });

  // Get membership with product
  const membership = await Membership.findById(membershipId).populate('product');
  console.log('Membership found:', {
    id: membership?._id,
    status: membership?.status,
    stripeSubscriptionId: membership?.stripeSubscriptionId,
    orgId: membership?.org,
    priceId: membership?.priceId,
    subscriptionStartDate: membership?.subscriptionStartDate
  });

  if (!membership) {
    console.error('Membership not found');
    throw new Error('Membership not found');
  }

  if (membership.status !== 'active') {
    console.error('Cannot cancel non-active membership:', membership.status);
    throw new Error('Can only cancel active memberships');
  }

  if (!membership.stripeSubscriptionId) {
    console.error('Membership has no Stripe subscription ID');
    throw new Error('Membership does not have a Stripe subscription');
  }

  // Get product price details for minContract calculation
  let minContractDate = null;
  let price = null;

  if (membership.product && membership.product.prices) {
    // Try to find matching price by priceId first
    if (membership.priceId) {
      price = membership.product.prices.find(p => p._id?.toString() === membership.priceId.toString());
    }

    // Fallback: match by priceName
    if (!price && membership.priceName) {
      price = membership.product.prices.find(p => p.name === membership.priceName);
    }

    // Fallback: if only one price exists, use it
    if (!price && membership.product.prices.length === 1) {
      price = membership.product.prices[0];
    }

    console.log('Price matching:', {
      membershipPriceId: membership.priceId,
      membershipPriceName: membership.priceName,
      matchedPrice: price ? { id: price._id, name: price.name } : null
    });

    if (price && price.minContract && price.billingFrequency) {
      minContractDate = calculateMinCancellationDate(
        membership.subscriptionStartDate,
        price.billingFrequency,
        price.minContract
      );
      console.log('Min contract calculation:', {
        priceId: price._id,
        priceName: price.name,
        billingFrequency: price.billingFrequency,
        minContract: price.minContract,
        subscriptionStartDate: membership.subscriptionStartDate,
        minContractDate
      });
    }
  }

  // Get org for Stripe account ID
  const org = await Org.findById(membership.org);
  console.log('Organization found:', {
    id: org?._id,
    name: org?.name,
    stripeAccountId: org?.stripeAccountId || 'none'
  });

  if (!org) {
    console.error('Organization not found:', membership.org);
    throw new Error('Organization not found');
  }

  try {
    // Use connected account if available
    const stripeOptions = org.stripeAccountId ? { stripeAccount: org.stripeAccountId } : {};
    console.log('Stripe options:', stripeOptions);

    // Determine the cancellation date and update Stripe accordingly
    let finalCancellationDate;
    let subscription;

    console.log('Calling Stripe API to cancel subscription...');

    // Check if we need to use cancel_at (specific date) vs cancel_at_period_end
    if (minContractDate && minContractDate > new Date(membership.nextBillingDate)) {
      // Use cancel_at to schedule cancellation for the min contract date
      const cancelAtTimestamp = Math.floor(minContractDate.getTime() / 1000);

      subscription = await stripe.subscriptions.update(
        membership.stripeSubscriptionId,
        {
          cancel_at: cancelAtTimestamp,
          metadata: {
            cancelled_by_employee: employeeId.toString(),
            cancellation_reason: reason || 'Customer requested cancellation',
            min_contract_enforced: 'true'
          }
        },
        stripeOptions
      );

      finalCancellationDate = minContractDate;
      console.log('Scheduled Stripe cancellation for min contract date:', {
        minContractDate,
        cancelAtTimestamp,
        action: 'Using cancel_at parameter'
      });
    } else {
      // Min contract is satisfied or doesn't exist, cancel at period end
      subscription = await stripe.subscriptions.update(
        membership.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
          metadata: {
            cancelled_by_employee: employeeId.toString(),
            cancellation_reason: reason || 'Customer requested cancellation'
          }
        },
        stripeOptions
      );

      if (subscription.current_period_end) {
        finalCancellationDate = new Date(subscription.current_period_end * 1000);
      } else if (subscription.cancel_at) {
        finalCancellationDate = new Date(subscription.cancel_at * 1000);
      } else {
        finalCancellationDate = membership.nextBillingDate;
      }

      console.log('Scheduled Stripe cancellation at period end:', finalCancellationDate);
    }

    console.log('Stripe subscription response (full object keys):', Object.keys(subscription));
    console.log('Stripe subscription updated:', {
      id: subscription.id,
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancel_at: subscription.cancel_at,
      cancel_at_date: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      current_period_end: subscription.current_period_end,
      current_period_end_date: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : 'undefined',
      status: subscription.status
    });

    // Update membership with cancellation info
    membership.cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
    membership.cancellationScheduledFor = finalCancellationDate;

    membership.cancellationReason = reason;
    membership.cancelledBy = employeeId;
    membership.cancelledAt = new Date();

    console.log('Membership fields before save:', {
      cancelAtPeriodEnd: membership.cancelAtPeriodEnd,
      cancellationScheduledFor: membership.cancellationScheduledFor,
      cancellationReason: membership.cancellationReason,
      cancelledBy: membership.cancelledBy,
      cancelledAt: membership.cancelledAt
    });

    const savedMembership = await membership.save();
    console.log('Membership saved successfully:', {
      id: savedMembership._id,
      cancelAtPeriodEnd: savedMembership.cancelAtPeriodEnd,
      cancellationScheduledFor: savedMembership.cancellationScheduledFor
    });

    // Populate customer and product for response
    await savedMembership.populate('customer');
    await savedMembership.populate('product');

    console.log('=== CANCEL MEMBERSHIP SUCCESS ===');
    return savedMembership;
  } catch (error) {
    console.error('=== CANCEL MEMBERSHIP ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    throw new Error(`Failed to cancel subscription: ${error.message}`);
  }
}

/**
 * Reactivate a cancelled membership (undo cancellation)
 * @param {Object} params - Reactivation parameters
 * @param {string} params.membershipId - Membership ID
 * @param {string} params.employeeId - Employee ID who initiated the reactivation
 * @returns {Object} Updated membership
 */
export async function reactivateMembership({
  membershipId,
  employeeId
}) {
  // Get membership
  const membership = await Membership.findById(membershipId);
  if (!membership) {
    throw new Error('Membership not found');
  }

  if (!membership.cancelAtPeriodEnd) {
    throw new Error('Membership is not scheduled for cancellation');
  }

  if (!membership.stripeSubscriptionId) {
    throw new Error('Membership does not have a Stripe subscription');
  }

  // Get org for Stripe account ID
  const org = await Org.findById(membership.org);
  if (!org) {
    throw new Error('Organization not found');
  }

  try {
    // Use connected account if available
    const stripeOptions = org.stripeAccountId ? { stripeAccount: org.stripeAccountId } : {};

    // Update the Stripe subscription to not cancel at period end
    await stripe.subscriptions.update(
      membership.stripeSubscriptionId,
      {
        cancel_at_period_end: false,
        metadata: {
          reactivated_by_employee: employeeId.toString(),
          reactivated_at: new Date().toISOString()
        }
      },
      stripeOptions
    );

    // Update membership to remove cancellation info
    membership.cancelAtPeriodEnd = false;
    membership.cancellationScheduledFor = null;
    membership.cancellationReason = null;
    membership.cancelledBy = null;
    membership.cancelledAt = null;

    await membership.save();

    // Populate customer and product for response
    await membership.populate('customer');
    await membership.populate('product');

    return membership;
  } catch (error) {
    console.error('Error reactivating Stripe subscription:', error);
    throw new Error(`Failed to reactivate subscription: ${error.message}`);
  }
}
