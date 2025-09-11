const nodemailer = require('nodemailer');

/**
 * Create and return email transporter based on EMAIL_PLATFORM environment variable
 * Supports: brevo, ethereal
 */
function createTransporter() {
  const platform = process.env.EMAIL_PLATFORM || 'ethereal';
  
  switch (platform.toLowerCase()) {
    case 'brevo':
      const brevoUser = process.env.BREVO_SMTP_USER;
      const brevoPass = process.env.BREVO_SMTP_PASS;
      
      if (!brevoUser || !brevoPass) {
        console.error('❌ Brevo credentials not configured. Please set BREVO_SMTP_USER and BREVO_SMTP_PASS environment variables.');
        console.log('📧 Falling back to Ethereal email transport');
        return createEtherealTransporter();
      }
      
      console.log('📧 Using Brevo SMTP transport');
      return nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: brevoUser,
          pass: brevoPass
        }
      });
      
    case 'ethereal':
    default:
      return createEtherealTransporter();
  }
}

/**
 * Create Ethereal transporter for testing
 */
function createEtherealTransporter() {
  const etherealUser = process.env.ETHEREAL_SMTP_USER;
  const etherealPass = process.env.ETHEREAL_SMTP_PASS;
  
  if (!etherealUser || !etherealPass) {
    console.error('❌ Ethereal credentials not configured. Please set ETHEREAL_SMTP_USER and ETHEREAL_SMTP_PASS environment variables.');
    throw new Error('Ethereal email credentials not configured');
  }
  
  console.log('📧 Using Ethereal email transport (testing mode)');
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: etherealUser,
      pass: etherealPass
    }
  });
}

// Create transporter lazily
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
}

/**
 * Send an email using the configured transporter
 * @param {Object} mailOptions - Nodemailer mail options
 * @param {string} mailOptions.from - Sender email address
 * @param {string} mailOptions.to - Recipient email address(es)
 * @param {string} mailOptions.subject - Email subject
 * @param {string} mailOptions.text - Plain text version
 * @param {string} mailOptions.html - HTML version
 * @param {Array} mailOptions.attachments - Optional attachments
 * @returns {Promise} - Email send result with success status and preview URL (if Ethereal)
 */
async function sendEmail(mailOptions) {
  try {
    const transport = getTransporter();
    const info = await transport.sendMail(mailOptions);
    
    const result = {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    };
    
    // If using Ethereal, add preview URL
    const platform = process.env.EMAIL_PLATFORM || 'ethereal';
    if (platform.toLowerCase() === 'ethereal') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('📧 Message sent:', info.messageId);
      console.log('👁️ Preview URL:', previewUrl);
      result.previewUrl = previewUrl;
    } else {
      console.log('✅ Email sent successfully:', info.messageId);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get the default 'from' address based on EMAIL_PLATFORM
 * @param {string} orgName - Organization name
 * @returns {string} - Formatted from address
 */
function getFromAddress(orgName = 'POS System') {
  const platform = process.env.EMAIL_PLATFORM || 'ethereal';
  
  switch (platform.toLowerCase()) {
    case 'brevo':
      const brevoFromEmail = process.env.BREVO_FROM_EMAIL || 'no-reply@cultcha.app';
      return `"${orgName}" <${brevoFromEmail}>`;
      
    case 'ethereal':
    default:
      const etherealEmail = process.env.ETHEREAL_SMTP_USER || 'test@ethereal.email';
      return `"${orgName}" <${etherealEmail}>`;
  }
}

/**
 * Verify transporter connection
 * Useful for testing email configuration
 * @returns {Promise<boolean>} - True if connection successful
 */
async function verifyConnection() {
  try {
    const transport = getTransporter();
    await transport.verify();
    const platform = process.env.EMAIL_PLATFORM || 'ethereal';
    console.log(`✅ Email transporter (${platform}) is ready`);
    return true;
  } catch (error) {
    console.error('❌ Email transporter verification failed:', error);
    return false;
  }
}

/**
 * Reset transporter (useful when changing email platform)
 */
function resetTransporter() {
  transporter = null;
  console.log('🔄 Email transporter reset');
}

module.exports = {
  sendEmail,
  getFromAddress,
  verifyConnection,
  resetTransporter
};