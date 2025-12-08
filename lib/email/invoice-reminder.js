import { sendEmail, getFromAddress } from '../mailer.js';
import { generateEmailLayout } from './common-layout.js';
import dayjs from 'dayjs';

/**
 * Get urgency styling based on days until due
 */
function getUrgencyStyles(daysUntilDue) {
  if (daysUntilDue <= 1) {
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#ef4444',
      textColor: '#991b1b',
      urgencyText: 'FINAL REMINDER',
      urgencyEmoji: '🚨'
    };
  } else if (daysUntilDue <= 3) {
    return {
      backgroundColor: '#fff7ed',
      borderColor: '#f97316',
      textColor: '#9a3412',
      urgencyText: 'REMINDER',
      urgencyEmoji: '⚠️'
    };
  } else {
    return {
      backgroundColor: '#fefce8',
      borderColor: '#eab308',
      textColor: '#854d0e',
      urgencyText: 'FRIENDLY REMINDER',
      urgencyEmoji: '📋'
    };
  }
}

/**
 * Send invoice payment reminder email
 * @param {Object} params
 * @param {Object} params.company - Company object (optional if customer provided)
 * @param {Object} params.customer - Customer object (optional if company provided)
 * @param {Object} params.org - Organization object with name
 * @param {Object} params.transaction - Transaction object with invoice details
 * @param {Date} params.dueDate - Invoice due date
 * @param {number} params.daysUntilDue - Days until the invoice is due
 * @param {string} params.invoiceUrl - Optional Stripe invoice URL
 * @param {string} params.paymentLink - Optional payment link URL
 * @returns {Promise} - Email send result
 */
export async function sendInvoiceReminderEmail({ company, customer, org, transaction, dueDate, daysUntilDue, invoiceUrl, paymentLink }) {
  try {
    // Determine payer details (company or customer)
    const isCompanyInvoice = !!company && !customer;
    const payerName = isCompanyInvoice ? company.name : customer.name;
    const payerEmail = isCompanyInvoice ? company.contactEmail : customer.email;
    const contactName = isCompanyInvoice ? (company.contactName || 'valued customer') : customer.name;

    // Get urgency styling
    const urgency = getUrgencyStyles(daysUntilDue);

    // Format due date
    const formattedDueDate = dayjs(dueDate).format('dddd, MMMM D, YYYY');

    // Format amounts
    const amountDue = transaction.invoiceAmountDue || transaction.total;
    const amountPaid = transaction.invoiceAmountPaid || 0;

    // Extract product names from cart
    const productNames = transaction.cart?.products?.map(p => p.name).join(', ') || 'purchased items';

    const purchaseContext = isCompanyInvoice
      ? `for <strong>${company.name}</strong>`
      : '';

    const content = `
      <div style="background-color: ${urgency.backgroundColor}; border-left: 4px solid ${urgency.borderColor}; padding: 16px; margin: 0 0 24px 0; border-radius: 4px;">
        <p style="margin: 0; color: ${urgency.textColor}; font-size: 16px; font-weight: 600;">
          ${urgency.urgencyEmoji} ${urgency.urgencyText}: Payment Due ${daysUntilDue === 1 ? 'Tomorrow' : daysUntilDue === 0 ? 'Today' : `in ${daysUntilDue} Days`}
        </p>
      </div>

      <h2 style="margin: 0 0 24px; color: #1e293b; font-size: 18px; font-weight: 600;">
        Invoice Payment Reminder
      </h2>

      <p style="margin: 0 0 16px; color: #424770; font-size: 15px; line-height: 24px;">
        Dear ${contactName},
      </p>

      <p style="margin: 0 0 16px; color: #424770; font-size: 15px; line-height: 24px;">
        This is a ${daysUntilDue <= 1 ? 'final ' : ''}reminder that payment is due ${purchaseContext ? purchaseContext + ' ' : ''}for the following invoice:
      </p>

      <div style="background-color: #f6f9fc; padding: 20px; margin: 24px 0; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #424770; font-size: 14px;">Invoice Reference:</td>
            <td style="padding: 8px 0; color: #424770; font-size: 14px; text-align: right;">#${transaction._id.toString().slice(-8).toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #424770; font-size: 14px;">Items:</td>
            <td style="padding: 8px 0; color: #424770; font-size: 14px; text-align: right;">${productNames}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #424770; font-size: 14px;">Invoice Total:</td>
            <td style="padding: 8px 0; color: #424770; font-size: 14px; text-align: right;">$${transaction.total?.toFixed(2)}</td>
          </tr>
          ${amountPaid > 0 ? `
          <tr>
            <td style="padding: 8px 0; color: #424770; font-size: 14px;">Amount Paid:</td>
            <td style="padding: 8px 0; color: #424770; font-size: 14px; text-align: right;">-$${amountPaid.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #424770; font-size: 14px;">Amount Due:</td>
            <td style="padding: 8px 0; color: #424770; font-size: 14px; text-align: right;">$${amountDue.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #424770; font-size: 14px;">Due Date:</td>
            <td style="padding: 8px 0; color: #424770; font-size: 14px; text-align: right;">${formattedDueDate}</td>
          </tr>
        </table>
      </div>

      ${paymentLink ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${paymentLink}"
           style="display: inline-block; background-color: #0F172A; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
          Pay Now
        </a>
      </div>
      <p style="margin: 0 0 16px; color: #6b7280; font-size: 13px; line-height: 20px; text-align: center;">
        Partial payments are supported. This link can be used for multiple payments.
      </p>
      ` : ''}

      ${invoiceUrl && !paymentLink ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${invoiceUrl}"
           style="display: inline-block; background-color: #0F172A; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
          View & Pay Invoice
        </a>
      </div>
      ` : ''}

      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e3e8ee;">
        <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 24px;">
          If you have already made this payment, please disregard this reminder. If you have any questions about this invoice, please don't hesitate to contact us.
        </p>
      </div>
    `;

    const emailHTML = generateEmailLayout({
      content,
      org,
      title: `Payment Reminder - ${payerName}`,
      headerText: `Payment Reminder from ${org.name}`,
      subHeaderText: `Invoice #${transaction._id.toString().slice(-8).toUpperCase()}`
    });

    const textPurchaseContext = isCompanyInvoice
      ? `for ${company.name}`
      : '';

    const textVersion = `
${org.name}

${urgency.urgencyText}: Payment Due ${daysUntilDue === 1 ? 'Tomorrow' : daysUntilDue === 0 ? 'Today' : `in ${daysUntilDue} Days`}

Dear ${contactName},

This is a ${daysUntilDue <= 1 ? 'final ' : ''}reminder that payment is due ${textPurchaseContext ? textPurchaseContext + ' ' : ''}for the following invoice:

Invoice Reference: #${transaction._id.toString().slice(-8).toUpperCase()}
Items: ${productNames}
Invoice Total: $${transaction.total?.toFixed(2)}
${amountPaid > 0 ? `Amount Paid: -$${amountPaid.toFixed(2)}` : ''}
Amount Due: $${amountDue.toFixed(2)}
Due Date: ${formattedDueDate}

${paymentLink ? `Pay now: ${paymentLink}
(Partial payments are supported. This link can be used for multiple payments.)
` : ''}
${invoiceUrl && !paymentLink ? `View and pay invoice: ${invoiceUrl}
` : ''}

If you have already made this payment, please disregard this reminder. If you have any questions about this invoice, please don't hesitate to contact us.

This email was sent by ${org.name}.
    `.trim();

    const result = await sendEmail({
      from: getFromAddress(org.name),
      to: payerEmail,
      subject: `${urgency.urgencyEmoji} Payment Reminder: Invoice Due ${daysUntilDue === 1 ? 'Tomorrow' : daysUntilDue === 0 ? 'Today' : `in ${daysUntilDue} Days`} - ${org.name}`,
      text: textVersion,
      html: emailHTML
    });

    return result;

  } catch (error) {
    console.error('Error sending invoice reminder email:', error);
    throw error;
  }
}
