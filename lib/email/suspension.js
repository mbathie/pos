import dayjs from 'dayjs';
import { sendEmail, getFromAddress } from '../mailer.js';

/**
 * Send membership suspension confirmation email
 * @param {Object} options - Email options
 * @param {Object} options.customer - Customer object with name and email
 * @param {Object} options.membership - Membership object
 * @param {Object} options.org - Organization object
 * @param {Date} options.suspendedUntil - Resume date
 * @param {number} options.suspensionDays - Number of suspension days
 * @param {number} options.creditAmount - Credit amount in dollars (positive number)
 * @param {boolean} options.isScheduled - Whether this was a scheduled suspension
 * @returns {Promise} - Email send result
 */
export async function sendSuspensionEmail({
  customer,
  membership,
  org,
  suspendedUntil,
  suspensionDays,
  creditAmount,
  isScheduled = false
}) {
  try {
    const orgName = org?.name || 'POS System';
    const customerName = customer?.name || 'Valued Customer';
    const customerEmail = customer?.email;

    if (!customerEmail) {
      console.log('No customer email provided, skipping suspension email');
      return { success: false, error: 'No customer email' };
    }

    // Format dates
    const resumeDate = dayjs(suspendedUntil).format('MMMM D, YYYY');
    const todayDate = dayjs().format('MMMM D, YYYY');

    // Format membership details
    const membershipType = membership?.priceName || 'Membership';
    const membershipAmount = membership?.amount ? `$${membership.amount}` : '';
    const billingPeriod = membership?.unit || 'month';

    // Build plain text email
    const subject = isScheduled
      ? `Your ${membershipType} has been paused as scheduled`
      : `Your ${membershipType} has been paused`;

    const textContent = `
Hi ${customerName},

${isScheduled
  ? `Your ${membershipType} has been paused as scheduled.`
  : `Your ${membershipType} has been successfully paused.`}

SUSPENSION DETAILS:
-------------------
Membership: ${membershipType} (${membershipAmount}/${billingPeriod})
Pause Duration: ${suspensionDays} day${suspensionDays !== 1 ? 's' : ''}
Resume Date: ${resumeDate}
${creditAmount > 0 ? `Credit Applied: $${creditAmount.toFixed(2)}` : ''}

WHAT THIS MEANS:
----------------
• Your membership billing is paused until ${resumeDate}
• You won't be charged during the pause period
${creditAmount > 0 ? `• A credit of $${creditAmount.toFixed(2)} has been applied to your account` : ''}
• Your membership will automatically resume on ${resumeDate}
• You can manually resume your membership at any time

NEED TO RESUME EARLY?
---------------------
If you'd like to resume your membership before ${resumeDate}, please visit us or contact our team.

If you have any questions, please don't hesitate to reach out.

Best regards,
${orgName} Team

---
This is an automated message. Please do not reply to this email.
${isScheduled ? `\nThis suspension was scheduled and processed automatically on ${todayDate}.` : ''}
    `.trim();

    // Send email
    const mailOptions = {
      from: getFromAddress(orgName),
      to: customerEmail,
      subject: subject,
      text: textContent
    };

    const result = await sendEmail(mailOptions);

    if (result.success) {
      console.log(`✅ Suspension email sent to ${customerEmail}`);
    } else {
      console.error(`❌ Failed to send suspension email to ${customerEmail}:`, result.error);
    }

    return result;

  } catch (error) {
    console.error('Error sending suspension email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send membership resume confirmation email
 * @param {Object} options - Email options
 * @param {Object} options.customer - Customer object with name and email
 * @param {Object} options.membership - Membership object
 * @param {Object} options.org - Organization object
 * @param {number} options.adjustmentAmount - Adjustment amount if resumed early (positive number)
 * @param {number} options.unusedDays - Number of unused suspension days
 * @returns {Promise} - Email send result
 */
export async function sendResumeEmail({
  customer,
  membership,
  org,
  adjustmentAmount,
  unusedDays
}) {
  try {
    const orgName = org?.name || 'POS System';
    const customerName = customer?.name || 'Valued Customer';
    const customerEmail = customer?.email;

    if (!customerEmail) {
      console.log('No customer email provided, skipping resume email');
      return { success: false, error: 'No customer email' };
    }

    // Format membership details
    const membershipType = membership?.priceName || 'Membership';
    const membershipAmount = membership?.amount ? `$${membership.amount}` : '';
    const billingPeriod = membership?.unit || 'month';
    const nextBillingDate = membership?.nextBillingDate
      ? dayjs(membership.nextBillingDate).format('MMMM D, YYYY')
      : 'your next billing date';

    // Build plain text email
    const subject = `Your ${membershipType} has been resumed`;

    const textContent = `
Hi ${customerName},

Your ${membershipType} has been successfully resumed.

MEMBERSHIP DETAILS:
-------------------
Membership: ${membershipType} (${membershipAmount}/${billingPeriod})
Status: Active
Next Billing Date: ${nextBillingDate}
${adjustmentAmount > 0 && unusedDays > 0 ? `
EARLY RESUME ADJUSTMENT:
-----------------------
You resumed ${unusedDays} day${unusedDays !== 1 ? 's' : ''} early.
Credit Adjustment: $${adjustmentAmount.toFixed(2)}
This adjustment has been applied to reduce your original pause credit.
` : ''}

Your membership benefits are now active again. Thank you for being a valued member!

If you have any questions, please don't hesitate to reach out.

Best regards,
${orgName} Team

---
This is an automated message. Please do not reply to this email.
    `.trim();

    // Send email
    const mailOptions = {
      from: getFromAddress(orgName),
      to: customerEmail,
      subject: subject,
      text: textContent
    };

    const result = await sendEmail(mailOptions);

    if (result.success) {
      console.log(`✅ Resume email sent to ${customerEmail}`);
    } else {
      console.error(`❌ Failed to send resume email to ${customerEmail}:`, result.error);
    }

    return result;

  } catch (error) {
    console.error('Error sending resume email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}