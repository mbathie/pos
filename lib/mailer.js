import nodemailer from 'nodemailer';

// Create transporter using Ethereal email
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'selena.towne84@ethereal.email',
        pass: 'EfJ93qsfKmK8csavf9'
    }
});

/**
 * Send email to new employee with account setup link
 * @param {string} to - Recipient email address
 * @param {string} name - Employee name
 * @param {string} employeeId - Employee ID for setup link
 * @param {string} orgName - Organization name
 * @returns {Promise} - Nodemailer send result
 */
export async function sendNewEmployeeEmail(to, name, employeeId, orgName) {
  try {
    const setupLink = `${process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000'}/employee/${employeeId}`;
    
    const mailOptions = {
      from: `"${orgName}" <selena.towne84@ethereal.email>`,
      to: to,
      subject: `Welcome to ${orgName} - Complete Your Account Setup`,
                  text: `
Hello ${name},

Your account has been created in ${orgName}.

To complete your account setup, please click the link below to set your password and PIN:
${setupLink}

This link will allow you to set up your secure login credentials.

Testing 123

Best regards,
${orgName} Team
      `,
                  html: `
        <h2>Welcome to ${orgName}</h2>
        <p>Hello ${name},</p>
        <p>Your account has been created in ${orgName}.</p>
        
        <p>To complete your account setup, please click the link below to set your password and PIN:</p>
        
        <p><a href="${setupLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Complete Account Setup</a></p>
        
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${setupLink}">${setupLink}</a></p>
        
        <p>This link will allow you to set up your secure login credentials.</p>
                        
        <p>Best regards,<br>
        ${orgName} Team</p>
      `
        };

        const info = await transporter.sendMail(mailOptions);
        
        // Log the preview URL for Ethereal
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        
        return {
            success: true,
            messageId: info.messageId,
            previewUrl: nodemailer.getTestMessageUrl(info)
        };
    } catch (error) {
        console.error('Error sending email:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send a test email
 * @param {string} to - Recipient email address
 * @param {string} orgName - Organization name
 * @returns {Promise} - Nodemailer send result
 */
export async function sendTestEmail(to, orgName = 'Your Organization') {
  try {
    const mailOptions = {
      from: `"${orgName}" <selena.towne84@ethereal.email>`,
      to: to,
      subject: `Test Email from ${orgName}`,
      text: 'Testing 123',
      html: `<h1>Testing 123</h1><p>This is a test email from ${orgName}.</p>`
    };

        const info = await transporter.sendMail(mailOptions);
        
        console.log('Test message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        
        return {
            success: true,
            messageId: info.messageId,
            previewUrl: nodemailer.getTestMessageUrl(info)
        };
    } catch (error) {
        console.error('Error sending test email:', error);
        return {
            success: false,
            error: error.message
        };
    }
} 