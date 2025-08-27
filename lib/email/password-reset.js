import { sendEmail, getFromAddress } from '../mailer';

/**
 * Send password reset email to customer
 * @param {Object} params - Email parameters
 * @param {string} params.email - Customer email address
 * @param {Object} params.customer - Customer object
 * @param {string} params.resetToken - Reset token for the URL
 * @param {string} params.orgName - Organization name
 * @returns {Promise} - Email send result
 */
export async function sendPasswordResetEmail({ email, customer, resetToken, orgName = 'Gym' }) {
  try {
    // Create reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000'}/c/reset-password?token=${resetToken}&email=${email}`;

    // Email HTML template
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #424770; background-color: #f6f9fc; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.07);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0; padding: 40px; text-align: center;">
            <div style="display: inline-block; width: 60px; height: 60px; background-color: white; border-radius: 50%; padding: 15px; margin-bottom: 20px;">
              <div style="color: #667eea; font-size: 24px; font-weight: bold; line-height: 60px;">
                🔐
              </div>
            </div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 500;">
              Password Reset Request
            </h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px;">
            <p style="color: #424770; font-size: 16px; margin-bottom: 20px;">
              Hi ${customer.name || 'there'},
            </p>
            
            <p style="color: #424770; font-size: 16px; margin-bottom: 25px;">
              We received a request to reset your password for your ${orgName} account. Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px; font-weight: 500;">
                Reset My Password
              </a>
            </div>
            
            <p style="color: #8898aa; font-size: 14px; margin-top: 30px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: #667eea; font-size: 14px; word-break: break-all; background-color: #f6f9fc; padding: 15px; border-radius: 6px;">
              ${resetUrl}
            </p>
            
            <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e3e8ee;">
              <p style="color: #8898aa; font-size: 14px; line-height: 1.5;">
                <strong>⏰ This link will expire in 1 hour.</strong>
              </p>
              <p style="color: #8898aa; font-size: 14px; line-height: 1.5;">
                If you didn't request a password reset, you can safely ignore this email. Your password won't be changed unless you click the link above and create a new one.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 25px; background-color: #f6f9fc; border-radius: 0 0 8px 8px;">
            <p style="margin: 0; color: #8898aa; font-size: 13px; text-align: center;">
              This email was sent to ${email}
            </p>
            <p style="margin: 8px 0 0 0; color: #8898aa; font-size: 13px; text-align: center;">
              © ${new Date().getFullYear()} ${orgName}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text version
    const emailText = `
Hi ${customer.name || 'there'},

We received a request to reset your password for your ${orgName} account.

To reset your password, click the link below:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

Best regards,
${orgName} Team
    `.trim();

    // Send email
    const mailOptions = {
      from: getFromAddress(orgName),
      to: email,
      subject: `Password Reset - ${orgName}`,
      text: emailText,
      html: emailHTML
    };

    return await sendEmail(mailOptions);
    
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}