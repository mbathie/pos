import nodemailer from "nodemailer";

/**
 * Create and return email transporter based on environment
 * In development: uses Ethereal email
 * In production: uses Gmail with app password
 */
function createTransporter() {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    // Development: Use Ethereal email for testing
    console.log('📧 Using Ethereal email transport (development mode)');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'selena.towne84@ethereal.email',
        pass: 'EfJ93qsfKmK8csavf9'
      }
    });
  } else {
    // Production: Use Gmail with app password
    const googleUser = process.env.GOOGLE_APP_USER;
    const googlePass = process.env.GOOGLE_APP_PASS;
    
    if (!googleUser || !googlePass) {
      console.error('❌ Gmail credentials not configured. Please set GOOGLE_APP_USER and GOOGLE_APP_PASS environment variables.');
      // Fallback to Ethereal if Gmail not configured
      console.log('📧 Falling back to Ethereal email transport');
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'selena.towne84@ethereal.email',
          pass: 'EfJ93qsfKmK8csavf9'
        }
      });
    }
    
    console.log('📧 Using Gmail transport (production mode)');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: googleUser,
        pass: googlePass
      }
    });
  }
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
 * @returns {Promise} - Email send result with success status and preview URL (in dev)
 */
export async function sendEmail(mailOptions) {
  try {
    const transport = getTransporter();
    const info = await transport.sendMail(mailOptions);
    
    const result = {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    };
    
    // In development, add preview URL
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
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
 * Get the default 'from' address based on environment
 * @param {string} orgName - Organization name
 * @returns {string} - Formatted from address
 */
export function getFromAddress(orgName = 'POS System') {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    return `"${orgName}" <selena.towne84@ethereal.email>`;
  } else {
    const googleUser = process.env.GOOGLE_APP_USER;
    if (googleUser) {
      return `"${orgName}" <${googleUser}>`;
    }
    // Fallback
    return `"${orgName}" <no-reply@cultcha.com>`;
  }
}

/**
 * Verify transporter connection
 * Useful for testing email configuration
 * @returns {Promise<boolean>} - True if connection successful
 */
export async function verifyConnection() {
  try {
    const transport = getTransporter();
    await transport.verify();
    console.log('✅ Email transporter is ready');
    return true;
  } catch (error) {
    console.error('❌ Email transporter verification failed:', error);
    return false;
  }
}