import { sendEmail, getFromAddress } from '../mailer.js';

/**
 * Send company waiver link email
 * @param {Object} params
 * @param {Object} params.company - Company object with name, contactEmail, contactName
 * @param {Object} params.org - Organization object with name
 * @param {string} params.waiverLink - Full waiver link URL
 * @param {Object} params.transaction - Transaction object with cart details
 * @returns {Promise} - Email send result
 */
export async function sendCompanyWaiverEmail({ company, org, waiverLink, transaction }) {
  try {
    // Extract product names from cart
    const productNames = transaction.cart?.products?.map(p => p.name).join(', ') || 'purchased items';

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Waiver Link for ${company.name}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #0F172A; padding: 40px 40px 30px;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${org.name}</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 20px; font-weight: 600;">
                      Waiver Signing Required
                    </h2>

                    <p style="margin: 0 0 16px; color: #424770; font-size: 16px; line-height: 24px;">
                      Dear ${company.contactName || 'valued customer'},
                    </p>

                    <p style="margin: 0 0 16px; color: #424770; font-size: 16px; line-height: 24px;">
                      Thank you for your recent purchase on behalf of <strong>${company.name}</strong>. To complete the registration process, each participant needs to sign a waiver.
                    </p>

                    <div style="background-color: #f6f9fc; border-left: 4px solid #0F172A; padding: 16px; margin: 24px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #424770; font-size: 14px;">
                        <strong>Purchase Details:</strong><br>
                        ${productNames}
                      </p>
                    </div>

                    <p style="margin: 0 0 16px; color: #424770; font-size: 16px; line-height: 24px;">
                      Please share the following link with all participants who need to complete the waiver:
                    </p>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                      <tr>
                        <td align="center">
                          <a href="${waiverLink}"
                             style="display: inline-block; background-color: #0F172A; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                            Complete Waiver
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 16px; color: #424770; font-size: 14px; line-height: 22px;">
                      Or copy and paste this link:<br>
                      <a href="${waiverLink}" style="color: #0F172A; word-break: break-all;">${waiverLink}</a>
                    </p>

                    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e3e8ee;">
                      <p style="margin: 0; color: #8898aa; font-size: 14px; line-height: 22px;">
                        <strong>Important:</strong> Each participant must fill out their own waiver form. The link can be shared with all participants.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f6f9fc; padding: 24px 40px; text-align: center;">
                    <p style="margin: 0; color: #8898aa; font-size: 12px; line-height: 18px;">
                      This email was sent by ${org.name}.<br>
                      If you have any questions, please contact us.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const textVersion = `
${org.name}

Waiver Signing Required

Dear ${company.contactName || 'valued customer'},

Thank you for your recent purchase on behalf of ${company.name}. To complete the registration process, each participant needs to sign a waiver.

Purchase Details:
${productNames}

Please share the following link with all participants who need to complete the waiver:
${waiverLink}

Important: Each participant must fill out their own waiver form. The link can be shared with all participants.

This email was sent by ${org.name}.
If you have any questions, please contact us.
    `.trim();

    const result = await sendEmail({
      from: getFromAddress(org.name),
      to: company.contactEmail,
      subject: `Waiver Link for ${company.name} - ${org.name}`,
      text: textVersion,
      html: emailHTML
    });

    return result;

  } catch (error) {
    console.error('Error sending company waiver email:', error);
    throw error;
  }
}
