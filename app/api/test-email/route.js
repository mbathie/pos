import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Org } from "@/models";
import { sendTestEmail } from "@/lib/mailer";

export async function POST(req) {
  await connectDB();
  
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get organization name for authenticated user
    const { employee: currentEmployee } = await getEmployee();
    let orgName = 'Your Organization';
    
    if (currentEmployee?.org) {
      const org = await Org.findById(currentEmployee.org).select('name').lean();
      orgName = org?.name || 'Your Organization';
    }

    const result = await sendTestEmail(email, orgName);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        previewUrl: result.previewUrl
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in test email endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 