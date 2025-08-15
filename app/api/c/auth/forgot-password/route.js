import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Customer } from "@/models";
import crypto from "crypto";
import nodemailer from 'nodemailer';

// Create transporter using Ethereal email for testing
// TODO: Replace with actual SMTP configuration in production
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: 'selena.towne84@ethereal.email',
    pass: 'EfJ93qsfKmK8csavf9'
  }
});

export async function POST(req) {
  try {
    await connectDB();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ 
        error: "Email is required" 
      }, { status: 400 });
    }

    // Find customer by email
    const customer = await Customer.findOne({ email }).populate('orgs');

    if (!customer) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive password reset instructions."
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Hash the token before storing
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save hashed token and expiry to customer
    customer.resetPasswordToken = hashedToken;
    customer.resetPasswordExpiry = resetTokenExpiry;
    await customer.save();

    // Create reset URL - using the unhashed token in the URL
    const resetUrl = `${process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:3000'}/c/reset-password?token=${resetToken}&email=${email}`;
    
    // Get org name for email
    const orgName = customer.orgs?.[0]?.name || 'Gym';

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
            
            <p style="color: #6b7280; font-size: 15px; margin-bottom: 30px;">
              We received a request to reset your password for your ${orgName} account. If you didn't make this request, you can safely ignore this email.
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetUrl}" style="
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);
              ">
                Reset Your Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
              Or copy and paste this link into your browser:
            </p>
            
            <div style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; word-break: break-all; margin-bottom: 30px;">
              <code style="color: #667eea; font-size: 13px;">
                ${resetUrl}
              </code>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 30px 0; border-radius: 4px;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                <strong>⏰ This link will expire in 1 hour</strong><br>
                For security reasons, this password reset link will only work for the next 60 minutes.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you're having trouble with the button above, copy and paste the URL into your web browser.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="padding: 30px 40px; border-top: 1px solid #e3e8ee; background-color: #f6f9fc; border-radius: 0 0 8px 8px;">
            <p style="margin: 0; color: #8898aa; font-size: 13px; text-align: center;">
              This email was sent to ${email} because a password reset was requested for this account.
            </p>
            <p style="margin: 10px 0 0 0; color: #8898aa; font-size: 13px; text-align: center;">
              © ${new Date().getFullYear()} ${orgName}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text version
    const emailText = `
Password Reset Request
======================

Hi ${customer.name || 'there'},

We received a request to reset your password for your ${orgName} account. If you didn't make this request, you can safely ignore this email.

To reset your password, click the link below:
${resetUrl}

This link will expire in 1 hour.

If you're having trouble clicking the link, copy and paste it into your web browser.

Best regards,
${orgName} Team
    `.trim();

    // Send email
    const mailOptions = {
      from: `"${orgName}" <no-reply@gym.com>`,
      to: email,
      subject: `Reset Your Password - ${orgName}`,
      text: emailText,
      html: emailHTML
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Password reset email sent:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive password reset instructions.",
      previewUrl: nodemailer.getTestMessageUrl(info) // Remove in production
    });

  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS(req) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}