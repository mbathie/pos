import Stripe from 'stripe';
import { Membership, Customer, Org } from '@/models';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

  // Get membership
  const membership = await Membership.findById(membershipId);
  console.log('Membership found:', {
    id: membership?._id,
    status: membership?.status,
    stripeSubscriptionId: membership?.stripeSubscriptionId,
    orgId: membership?.org
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

    console.log('Calling Stripe API to cancel subscription...');
    // Cancel the Stripe subscription at period end
    const subscription = await stripe.subscriptions.update(
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

    console.log('Stripe subscription response (full object keys):', Object.keys(subscription));
    console.log('Stripe subscription updated:', {
      id: subscription.id,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: subscription.current_period_end,
      current_period_end_date: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : 'undefined',
      status: subscription.status,
      cancel_at: subscription.cancel_at
    });

    // Update membership with cancellation info
    membership.cancelAtPeriodEnd = true;

    // Use subscription current_period_end if available, otherwise fall back to membership nextBillingDate
    if (subscription.current_period_end) {
      membership.cancellationScheduledFor = new Date(subscription.current_period_end * 1000);
    } else if (subscription.cancel_at) {
      membership.cancellationScheduledFor = new Date(subscription.cancel_at * 1000);
    } else {
      console.warn('No current_period_end or cancel_at from Stripe, using membership nextBillingDate');
      membership.cancellationScheduledFor = membership.nextBillingDate;
    }

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
