import { sendEmail, getFromAddress } from '../mailer.js';
import { generateEmailLayout } from './common-layout.js';

/**
 * Send invoice-only email (no waiver required)
 * @param {Object} params
 * @param {Object} params.company - Company object with name, contactEmail, contactName (optional if customer provided)
 * @param {Object} params.customer - Customer object with name, email (optional if company provided)
 * @param {Object} params.org - Organization object with name
 * @param {Object} params.transaction - Transaction object with cart details
 * @param {string} params.invoiceUrl - Optional Stripe invoice URL
 * @param {string} params.paymentLink - Optional payment link URL
 * @returns {Promise} - Email send result
 */
export async function sendInvoiceEmail({ company, customer, org, transaction, invoiceUrl, paymentLink }) {
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
        Invoice for Your Purchase
      </h2>

      <p style="margin: 0 0 16px; color: #424770; font-size: 15px; line-height: 24px;">
        Dear ${contactName},
      </p>

      <p style="margin: 0 0 16px; color: #424770; font-size: 15px; line-height: 24px;">
        Thank you for ${purchaseContext}. Please find your invoice details below.
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

      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e3e8ee;">
        <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 24px;">
          If you have any questions about this invoice, please don't hesitate to contact us.
        </p>
      </div>
    `;

    const emailHTML = generateEmailLayout({
      content,
      org,
      title: `Invoice for ${payerName}`,
      headerText: `Invoice from ${org.name}`,
      subHeaderText: `For ${payerName}`
    });

    const textPurchaseContext = isCustomerInvoice
      ? `your recent purchase`
      : `your recent purchase on behalf of ${company.name}`;

    const textVersion = `
${org.name}

Invoice for Your Purchase

Dear ${contactName},

Thank you for ${textPurchaseContext}. Please find your invoice details below.

Purchase Details:
${productNames}
${transaction.total ? `Total Amount: $${transaction.total.toFixed(2)}` : ''}

${paymentLink ? `
PAYMENT INVOICE
An invoice for $${transaction.total.toFixed(2)} has been sent for this purchase.
View and pay invoice: ${paymentLink}
(Partial payments are supported. This link can be used multiple times for multiple payments.)
` : ''}

If you have any questions about this invoice, please don't hesitate to contact us.

This email was sent by ${org.name}.
    `.trim();

    const result = await sendEmail({
      from: getFromAddress(org.name),
      to: payerEmail,
      subject: `Invoice for ${payerName} - ${org.name}`,
      text: textVersion,
      html: emailHTML
    });

    return result;

  } catch (error) {
    console.error('Error sending invoice email:', error);
    throw error;
  }
}
