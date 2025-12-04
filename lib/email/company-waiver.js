import { sendEmail, getFromAddress } from '../mailer.js';
import { generateEmailLayout } from './common-layout.js';

/**
 * Send company/customer waiver link email
 * @param {Object} params
 * @param {Object} params.company - Company object with name, contactEmail, contactName (optional if customer provided)
 * @param {Object} params.customer - Customer object with name, email (optional if company provided)
 * @param {Object} params.org - Organization object with name
 * @param {string} params.waiverLink - Full waiver link URL
 * @param {Object} params.transaction - Transaction object with cart details
 * @param {string} params.invoiceUrl - Optional Stripe invoice URL
 * @param {string} params.paymentLink - Optional payment link URL
 * @returns {Promise} - Email send result
 */
export async function sendCompanyWaiverEmail({ company, customer, org, waiverLink, transaction, invoiceUrl, paymentLink }) {
  try {
    // Determine payer details (company or customer)
    const isCustomerInvoice = !!customer && !company;
    const payerName = isCustomerInvoice ? customer.name : company.name;
    const payerEmail = isCustomerInvoice ? customer.email : company.contactEmail;
    const contactName = isCustomerInvoice ? customer.name : (company.contactName || 'valued customer');

    // Extract product names from cart
    const productNames = transaction.cart?.products?.map(p => p.name).join(', ') || 'purchased items';

    const purchaseContext = isCustomerInvoice
      ? `your recent purchase`
      : `your recent purchase on behalf of <strong>${company.name}</strong>`;

    const content = `
      <h2 style="margin: 0 0 24px; color: #1e293b; font-size: 18px; font-weight: 600;">
        Waiver Signing Required
      </h2>

      <p style="margin: 0 0 16px; color: #424770; font-size: 15px; line-height: 24px;">
        Dear ${contactName},
      </p>

      <p style="margin: 0 0 16px; color: #424770; font-size: 15px; line-height: 24px;">
        Thank you for ${purchaseContext}. To complete the registration process, each participant needs to sign a waiver.
      </p>

      <div style="background-color: #f6f9fc; border-left: 4px solid #1e293b; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; color: #424770; font-size: 15px; line-height: 24px;">
          <strong>Purchase Details:</strong><br>
          ${productNames}
          ${transaction.total ? `<br><strong>Total Amount:</strong> $${transaction.total.toFixed(2)}` : ''}
        </p>
      </div>

      ${paymentLink ? `
      <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0 0 12px; color: #856404; font-size: 15px; line-height: 24px;">
          <strong>📄 Payment Invoice</strong>
        </p>
        <p style="margin: 0 0 16px; color: #856404; font-size: 15px; line-height: 24px;">
          An invoice for $${transaction.total.toFixed(2)} has been sent for this purchase. You can view and pay the invoice using the link below:
        </p>
        <div style="text-align: center; margin: 16px 0;">
          <a href="${paymentLink}"
             style="display: inline-block; background-color: #0F172A; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-size: 15px; font-weight: 600;">
            View & Pay Invoice
          </a>
        </div>
        <p style="margin: 12px 0 0; color: #856404; font-size: 13px; line-height: 20px;">
          The invoice supports partial payments. You can pay the full amount or make partial payments as needed. This link can be used multiple times for multiple payments.
        </p>
      </div>
      ` : ''}

      <p style="margin: 0 0 24px; color: #424770; font-size: 15px; line-height: 24px;">
        Please share the following link with all participants who need to complete the waiver:
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${waiverLink}"
           style="display: inline-block; background-color: #1e293b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 15px; font-weight: 600;">
          Complete Waiver
        </a>
      </div>

      <p style="margin: 0 0 16px; color: #424770; font-size: 15px; line-height: 24px;">
        Or copy and paste this link:<br>
        <a href="${waiverLink}" style="color: #1e293b; word-break: break-all; font-size: 15px;">${waiverLink}</a>
      </p>

      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e3e8ee;">
        <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 24px;">
          <strong>Important:</strong> Each participant must fill out their own waiver form. The link can be shared with all participants.
        </p>
      </div>
    `;

    const emailHTML = generateEmailLayout({
      content,
      org,
      title: `Waiver Link for ${payerName}`,
      headerText: `Waiver from ${org.name}`,
      subHeaderText: `For ${payerName}`
    });

    const textPurchaseContext = isCustomerInvoice
      ? `your recent purchase`
      : `your recent purchase on behalf of ${company.name}`;

    const textVersion = `
${org.name}

Waiver Signing Required

Dear ${contactName},

Thank you for ${textPurchaseContext}. To complete the registration process, each participant needs to sign a waiver.

Purchase Details:
${productNames}
${transaction.total ? `Total Amount: $${transaction.total.toFixed(2)}` : ''}

${paymentLink ? `
PAYMENT INVOICE
An invoice for $${transaction.total.toFixed(2)} has been sent for this purchase.
View and pay invoice: ${paymentLink}
(Partial payments are supported. This link can be used multiple times for multiple payments.)
` : ''}

Please share the following link with all participants who need to complete the waiver:
${waiverLink}

Important: Each participant must fill out their own waiver form. The link can be shared with all participants.

This email was sent by ${org.name}.
If you have any questions, please contact us.
    `.trim();

    const result = await sendEmail({
      from: getFromAddress(org.name),
      to: payerEmail,
      subject: `Waiver Link for ${payerName} - ${org.name}`,
      text: textVersion,
      html: emailHTML
    });

    return result;

  } catch (error) {
    console.error('Error sending company waiver email:', error);
    throw error;
  }
}
