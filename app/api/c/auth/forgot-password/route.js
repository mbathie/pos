import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Customer } from "@/models";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";

export async function POST(req) {
  try {
    await connectDB();
    
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({
        error: 'Email is required'
      }, { status: 400 });
    }
    
    // Find customer by email (populate orgs for org name)
    const customer = await Customer.findOne({ email }).populate('orgs', 'name');
    
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

    // Get org name for email
    const orgName = customer.orgs?.[0]?.name || 'Gym';

    // Send password reset email
    const emailResult = await sendPasswordResetEmail({
      email,
      customer,
      resetToken,
      orgName
    });

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive password reset instructions.",
      previewUrl: emailResult.previewUrl // Remove in production
    });

  } catch (error) {
    console.error('Error in forgot password:', error);
    return NextResponse.json({
      error: 'An error occurred processing your request'
    }, { status: 500 });
  }
}