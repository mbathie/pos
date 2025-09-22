import Stripe from 'stripe';
import { Membership, Transaction, Customer } from '@/models';
import { sendSuspensionEmail, sendResumeEmail } from '@/lib/email/suspension';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Pause a membership subscription for a specified number of days
 * @param {Object} params - Suspension parameters
 * @param {string} params.customerId - Customer ID
 * @param {string} params.membershipId - Membership ID
 * @param {number} params.suspensionDays - Number of days to suspend
 * @param {string} params.employeeId - Employee ID who initiated the suspension
 * @param {string} params.note - Optional note about the suspension
 * @param {string} params.pauseStartDate - Optional future date when pause should start (YYYY-MM-DD)
 * @param {Object} params.org - Organization object with settings
 * @returns {Object} Updated membership
 */
export async function pauseMembership({
  customerId,
  membershipId,
  suspensionDays,
  employeeId,
  note,
  pauseStartDate,
  org
}) {
  // Validate suspension days
  const maxDays = org.membershipSuspensionDaysPerYear || 30;
  if (suspensionDays <= 0 || suspensionDays > maxDays) {
    throw new Error(`Suspension days must be between 1 and ${maxDays}`);
  }

  // Get membership
  const membership = await Membership.findById(membershipId);
  if (!membership) {
    throw new Error('Membership not found');
  }

  if (membership.status !== 'active') {
    throw new Error('Can only pause active memberships');
  }

  // Verify customer matches
  if (membership.customer.toString() !== customerId.toString()) {
    throw new Error('Customer does not match membership');
  }

  // Calculate the 365-day period based on subscription start date
  const now = new Date();
  let currentYearStart = new Date(membership.subscriptionStartDate);

  // Find the current year period we're in
  while (currentYearStart <= now) {
    const nextYearStart = new Date(currentYearStart);
    nextYearStart.setFullYear(nextYearStart.getFullYear() + 1);

    if (now < nextYearStart) {
      // We're in this year period
      break;
    }
    currentYearStart.setFullYear(currentYearStart.getFullYear() + 1);
  }

  // Calculate total suspension days used in current 365-day period
  const currentYearEnd = new Date(currentYearStart);
  currentYearEnd.setFullYear(currentYearEnd.getFullYear() + 1);

  const existingSuspensions = (membership.suspensions || []).filter(s =>
    new Date(s.suspendedAt) >= currentYearStart &&
    new Date(s.suspendedAt) < currentYearEnd
  );

  const usedDays = existingSuspensions.reduce((total, s) => total + s.suspensionDays, 0);
  const remainingDays = maxDays - usedDays;

  if (suspensionDays > remainingDays) {
    throw new Error(`Only ${remainingDays} suspension days remaining in current year (${usedDays} of ${maxDays} days used)`);
  }

  // Calculate pause start and resume dates
  let pauseStartsAt = new Date();

  // If a future pause date is specified, use that instead
  if (pauseStartDate) {
    pauseStartsAt = new Date(pauseStartDate);

    // Validate that the pause date is in the future
    if (pauseStartsAt <= now) {
      throw new Error('Scheduled pause date must be in the future');
    }

    // Validate that the pause date is before the next billing date
    if (membership.nextBillingDate && pauseStartsAt >= new Date(membership.nextBillingDate)) {
      throw new Error('Scheduled pause date must be before the next billing date');
    }
  }

  const resumesAt = new Date(pauseStartsAt);
  resumesAt.setDate(resumesAt.getDate() + suspensionDays);

  // Handle Stripe subscription pause
  let stripeUpdated = false;
  let invoiceItem = null;

  if (membership.stripeSubscriptionId) {
    try {
      // Use connected account if available
      const stripeOptions = org.stripeAccountId ? { stripeAccount: org.stripeAccountId } : {};

      if (pauseStartDate) {
        // For scheduled pauses, we need to handle this differently
        // Stripe doesn't support scheduling pause_collection for a future date
        // We'll store the scheduled pause and handle it via a cron job or webhook
        console.log('Scheduled pause for', pauseStartDate, '- will be processed when date arrives');
        // For now, we'll just store it locally and NOT update Stripe yet
        stripeUpdated = false;
      } else {
        // Immediate pause - update Stripe now
        await stripe.subscriptions.update(membership.stripeSubscriptionId, {
          pause_collection: {
            behavior: 'void',
            resumes_at: Math.floor(resumesAt.getTime() / 1000) // Unix timestamp
          }
        }, stripeOptions);
        stripeUpdated = true;
      }

    // Create negative invoice item for the suspension period
    // Calculate prorated credit amount
    // For monthly subscriptions, max credit is one month's worth
    // For yearly subscriptions, calculate based on 365 days
    let daysInPeriod;
    if (membership.unit === 'month') {
      daysInPeriod = 30; // Approximate month
    } else if (membership.unit === 'year') {
      daysInPeriod = 365;
    } else if (membership.unit === 'week') {
      daysInPeriod = 7;
    } else {
      daysInPeriod = 30; // Default to month
    }

    const dailyRate = membership.amount / daysInPeriod;

    // Credit is limited to the amount that would have been charged during the pause period
    // For example, if pausing 90 days on a monthly subscription:
    // - They'll skip 3 billing cycles
    // - Credit should be for the partial month only (from pause date to next billing)
    const daysUntilNextBilling = Math.ceil((new Date(membership.nextBillingDate) - pauseStartsAt) / (1000 * 60 * 60 * 24));
    const creditDays = Math.min(suspensionDays, daysUntilNextBilling);
    const creditAmount = Math.round(dailyRate * creditDays * 100); // In cents

      // Only create invoice item if we have a valid Stripe customer
      if (membership.stripeCustomerId && creditAmount > 0) {
        invoiceItem = await stripe.invoiceItems.create({
          customer: membership.stripeCustomerId,
          amount: -creditAmount, // Negative amount for credit
          currency: 'aud',
          description: `Membership suspension credit: ${suspensionDays} days`,
          subscription: membership.stripeSubscriptionId,
          metadata: {
            type: 'suspension_credit',
            suspensionDays: suspensionDays.toString(),
            membershipId: membershipId,
            customerId: customerId
          }
        }, stripeOptions);
      }
    } catch (stripeError) {
      console.error('Stripe error during pause:', stripeError);
      // If Stripe fails, we can still pause locally
      // Log the error but continue with local pause
      stripeUpdated = false;
    }
  }

  // Add suspension record to membership
  if (!membership.suspensions) {
    membership.suspensions = [];
  }

  membership.suspensions.push({
    suspendedAt: pauseStartsAt,  // Use the scheduled pause date (or now for immediate)
    suspensionDays: suspensionDays,
    resumesAt: resumesAt,
    yearStartDate: currentYearStart,
    stripeInvoiceItemId: invoiceItem?.id || null,
    createdBy: employeeId,
    note: note,
    scheduledPause: pauseStartDate ? true : false,  // Track if this was scheduled
    createdAt: new Date()  // Track when this suspension was created
  });

  // Update membership status
  if (pauseStartDate) {
    // For scheduled pauses, don't change status yet
    membership.scheduledPauseDate = pauseStartsAt;
    membership.scheduledResumDate = resumesAt;
    membership.scheduledPauseDays = suspensionDays;
  } else {
    // For immediate pauses, update status now
    membership.status = 'suspended';
    membership.suspendedUntil = resumesAt;
  }

  // Save changes
  await membership.save();

  // Create transaction record for tracking
  const creditAmount = invoiceItem ? Math.abs(invoiceItem.amount / 100) : 0;
  if (creditAmount > 0) {
    await Transaction.create({
      org: org._id,
      location: membership.location,
      customer: customerId,
      employee: employeeId,
      paymentMethod: 'adjustment',
      type: 'adjustment',
      status: 'success',
      amount: -creditAmount,
      tax: 0,
      discount: 0,
      surcharge: 0,
      total: -creditAmount,
      notes: `Membership suspension: ${suspensionDays} days${!stripeUpdated ? ' (Stripe sync pending)' : ''}`,
      stripePaymentIntentId: invoiceItem?.id || null,
      products: [{
        product: membership.product,
        name: 'Membership Suspension Credit',
        quantity: suspensionDays,
        price: -(creditAmount / suspensionDays),
        total: -creditAmount
      }]
    });
  }

  // Send suspension email for immediate pauses (scheduled pauses will email when processed)
  if (!pauseStartDate) {
    try {
      const customer = await Customer.findById(customerId);
      await sendSuspensionEmail({
        customer,
        membership,
        org,
        suspendedUntil: resumesAt,
        suspensionDays,
        creditAmount,
        isScheduled: false
      });
    } catch (emailError) {
      console.error('Failed to send suspension email:', emailError);
      // Don't throw error - suspension was successful even if email failed
    }
  }

  return { membership, stripeUpdated };
}

/**
 * Resume a paused membership immediately
 * @param {Object} params - Resume parameters
 * @param {string} params.membershipId - Membership ID
 * @param {string} params.employeeId - Employee ID who initiated the resume
 * @param {Object} params.org - Organization object with stripeAccountId
 * @returns {Object} Updated membership
 */
export async function resumeMembership({ membershipId, employeeId, org }) {
  const membership = await Membership.findById(membershipId);
  if (!membership) {
    throw new Error('Membership not found');
  }

  if (membership.status !== 'suspended') {
    throw new Error('Can only resume suspended memberships');
  }

  // Calculate if we're resuming early and need to adjust credits
  const now = new Date();
  const originalResumeDate = new Date(membership.suspendedUntil);
  const isEarlyResume = now < originalResumeDate;
  let creditAdjustment = null;

  if (isEarlyResume && membership.suspensions && membership.suspensions.length > 0) {
    // Find the most recent suspension
    const currentSuspension = membership.suspensions[membership.suspensions.length - 1];

    if (currentSuspension.stripeInvoiceItemId) {
      // Calculate the reduced credit amount based on actual days paused
      const actualPausedDays = Math.ceil((now - new Date(currentSuspension.suspendedAt)) / (1000 * 60 * 60 * 24));
      const originalPausedDays = currentSuspension.suspensionDays;
      const daysNotUsed = originalPausedDays - actualPausedDays;

      if (daysNotUsed > 0) {
        // Calculate the adjustment needed
        let daysInPeriod = 30; // Default to month
        if (membership.unit === 'year') daysInPeriod = 365;
        else if (membership.unit === 'week') daysInPeriod = 7;

        const dailyRate = membership.amount / daysInPeriod;
        const adjustmentAmount = Math.round(dailyRate * daysNotUsed * 100); // In cents

        try {
          const stripeOptions = org?.stripeAccountId ? { stripeAccount: org.stripeAccountId } : {};

          // Create a positive invoice item to offset the original credit
          creditAdjustment = await stripe.invoiceItems.create({
            customer: membership.stripeCustomerId,
            amount: adjustmentAmount, // Positive amount to reduce the credit
            currency: 'aud',
            description: `Early membership resume adjustment: ${daysNotUsed} days unused`,
            subscription: membership.stripeSubscriptionId,
            metadata: {
              type: 'early_resume_adjustment',
              originalSuspensionDays: originalPausedDays.toString(),
              actualPausedDays: actualPausedDays.toString(),
              daysNotUsed: daysNotUsed.toString(),
              membershipId: membershipId,
              originalInvoiceItemId: currentSuspension.stripeInvoiceItemId
            }
          }, stripeOptions);

          // Update the suspension record to reflect early resume
          currentSuspension.actualResumedAt = now;
          currentSuspension.adjustmentInvoiceItemId = creditAdjustment.id;
        } catch (error) {
          console.error('Error adjusting credit for early resume:', error);
          // Continue with resume even if credit adjustment fails
        }
      }
    }
  }

  // Resume Stripe subscription immediately
  let stripeUpdated = false;
  if (membership.stripeSubscriptionId) {
    try {
      // Use connected account if available
      const stripeOptions = org?.stripeAccountId ? { stripeAccount: org.stripeAccountId } : {};

      await stripe.subscriptions.update(membership.stripeSubscriptionId, {
        pause_collection: null // Remove pause
      }, stripeOptions);
      stripeUpdated = true;
    } catch (stripeError) {
      console.error('Stripe error during resume:', stripeError);
      // If Stripe fails, we can still resume locally
      // Log the error but continue
    }
  }

  // Update membership status regardless of Stripe success
  membership.status = 'active';
  membership.suspendedUntil = null;

  await membership.save();

  // Send resume email
  try {
    const customer = await Customer.findById(membership.customer);
    const adjustmentAmount = creditAdjustment ? Math.abs(creditAdjustment.amount / 100) : 0;
    await sendResumeEmail({
      customer,
      membership,
      org,
      adjustmentAmount,
      unusedDays
    });
  } catch (emailError) {
    console.error('Failed to send resume email:', emailError);
    // Don't throw error - resume was successful even if email failed
  }

  return {
    membership,
    stripeUpdated,
    creditAdjustment: creditAdjustment ? {
      amount: creditAdjustment.amount / 100,
      description: creditAdjustment.description
    } : null
  };
}

/**
 * Get suspension history for a membership
 * @param {string} membershipId - Membership ID
 * @returns {Array} Suspension history
 */
export async function getSuspensionHistory(membershipId) {
  const membership = await Membership.findById(membershipId)
    .populate('suspensions.createdBy', 'name');

  if (!membership) {
    throw new Error('Membership not found');
  }

  return membership.suspensions || [];
}

/**
 * Calculate remaining suspension days for a membership
 * @param {string} customerId - Customer ID (for verification)
 * @param {string} membershipId - Membership ID
 * @param {Object} org - Organization object with settings
 * @returns {Object} Suspension days information
 */
export async function getRemainingSupensionDays(customerId, membershipId, org) {
  const membership = await Membership.findById(membershipId);
  if (!membership) {
    throw new Error('Membership not found');
  }

  // Verify customer matches if provided
  if (customerId && membership.customer.toString() !== customerId.toString()) {
    throw new Error('Customer does not match membership');
  }

  const maxDays = org.membershipSuspensionDaysPerYear || 30;
  const now = new Date();

  // Find current year period based on subscription start date
  let currentYearStart = new Date(membership.subscriptionStartDate);
  while (currentYearStart <= now) {
    const nextYearStart = new Date(currentYearStart);
    nextYearStart.setFullYear(nextYearStart.getFullYear() + 1);

    if (now < nextYearStart) {
      break;
    }
    currentYearStart.setFullYear(currentYearStart.getFullYear() + 1);
  }

  const currentYearEnd = new Date(currentYearStart);
  currentYearEnd.setFullYear(currentYearEnd.getFullYear() + 1);

  // Calculate used suspension days
  const existingSuspensions = (membership.suspensions || []).filter(s =>
    new Date(s.suspendedAt) >= currentYearStart &&
    new Date(s.suspendedAt) < currentYearEnd
  );

  const usedDays = existingSuspensions.reduce((total, s) => total + s.suspensionDays, 0);
  const remainingDays = maxDays - usedDays;

  return {
    maxDays,
    usedDays,
    remainingDays,
    currentPeriodStart: currentYearStart,
    currentPeriodEnd: currentYearEnd,
    suspensions: existingSuspensions
  };
}