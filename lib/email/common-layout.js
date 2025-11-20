/**
 * Common email layout for all email templates
 * Provides consistent header and footer across all emails
 */

/**
 * Generate email layout with common header and footer
 * @param {Object} params
 * @param {string} params.content - HTML content to insert in the body
 * @param {Object} params.org - Organization object with name, logo, contact details
 * @param {string} params.title - Email title/subject
 * @param {string} params.headerText - Text to display in header (e.g., "Receipt from Marks Gyms")
 * @param {string} params.subHeaderText - Optional sub-header text (e.g., "Receipt #6EA8A72A")
 * @returns {string} - Complete HTML email
 */
export function generateEmailLayout({ content, org, title, headerText, subHeaderText }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #424770; background-color: #f6f9fc; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.07);">

        <!-- Header with dark gradient background -->
        <div style="position: relative; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 8px 8px 0 0; padding: 40px 40px 80px 40px; text-align: center;">
          ${(() => {
            if (org?.logo) {
              // Use the logo URL directly for emails
              const logoUrl = org.logo;

              return `
                <div style="margin-bottom: 20px;">
                  <img src="${logoUrl}"
                       alt="${org.name}"
                       style="max-height: 60px; max-width: 180px; border-radius: 8px;" />
                </div>
              `;
            } else {
              return `
                <div style="display: inline-block; width: 60px; height: 60px; background-color: rgba(255, 255, 255, 0.1); border-radius: 50%; padding: 15px; margin-bottom: 20px;">
                  <div style="color: white; font-size: 20px; font-weight: bold; line-height: 60px;">
                    ${org?.name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                </div>
              `;
            }
          })()}
          <h1 style="color: white; margin: 0; font-size: 18px; font-weight: 500;">
            ${headerText}
          </h1>
          ${subHeaderText ? `
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">
              ${subHeaderText}
            </p>
          ` : ''}
        </div>

        <!-- White angled overlay -->
        <div style="background-color: white; margin-top: -40px; position: relative; z-index: 1; border-radius: 8px;">

          <!-- Content section -->
          <div style="padding: 40px;">
            ${content}
          </div>

          <!-- Footer -->
          <div style="padding: 30px 40px; background-color: #f6f9fc; border-radius: 0 0 8px 8px;">
            <!-- Organization Details -->
            ${org?.name || org?.addressLine || org?.suburb || org?.state || org?.postcode || org?.phone || org?.email ? `
            <div style="text-align: center; margin-bottom: 30px;">
              ${org?.name ? `<p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 500;">${org.name}</p>` : ''}
              ${org?.phone ? `<p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">Phone: ${org.phone}</p>` : ''}
              ${org?.addressLine ? `<p style="margin: 0 0 2px 0; color: #6b7280; font-size: 12px;">${org.addressLine}</p>` : ''}
              ${org?.suburb || org?.state || org?.postcode ? `
                <p style="margin: 0; color: #6b7280; font-size: 12px;">
                  ${org?.suburb || ''}${org?.suburb && (org?.state || org?.postcode) ? ', ' : ''}${org?.state || ''}${org?.state && org?.postcode ? ' ' : ''}${org?.postcode || ''}
                </p>
              ` : ''}
            </div>
            ` : ''}

            <!-- Email disclaimer -->
            <div style="text-align: center; margin-bottom: 40px;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
                You're receiving this email because you made a purchase at ${org?.name || 'our store'}.
                Something wrong with the email?
                <a href="#" style="color: #3b82f6; text-decoration: none;">View it in your browser</a>.
              </p>
            </div>

            <!-- Powered by Cultcha -->
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e3e8ee;">
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px;">
                Powered By
              </p>
              <a href="${process.env.NEXT_PUBLIC_DOMAIN}"
                 target="_blank"
                 style="text-decoration: none; display: inline-block;">
                <img src="${process.env.EMAIL_ASSETS_DOMAIN || process.env.NEXT_PUBLIC_DOMAIN}/cultcha-logo-dark.png"
                     alt="Cultcha"
                     style="height: 32px; display: inline-block;"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
