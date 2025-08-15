import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Customer } from "@/models";
import bcrypt from "bcrypt";
import crypto from "crypto";

export async function POST(req) {
  try {
    await connectDB();
    const { token, email, newPassword } = await req.json();

    // Validate input
    if (!token || !email || !newPassword) {
      return NextResponse.json({ 
        error: "Token, email, and new password are required" 
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ 
        error: "Password must be at least 6 characters long" 
      }, { status: 400 });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find customer with valid reset token
    const customer = await Customer.findOne({
      email,
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: new Date() } // Token not expired
    });

    if (!customer) {
      return NextResponse.json({ 
        error: "Invalid or expired reset token" 
      }, { status: 400 });
    }

    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);

    // Update customer password and clear reset token
    customer.hash = hash;
    customer.resetPasswordToken = undefined;
    customer.resetPasswordExpiry = undefined;
    await customer.save();

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now login with your new password."
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