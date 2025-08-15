import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcrypt";
import { connectDB } from "@/lib/mongoose";
import { Customer } from "@/models";

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(req) {
  try {
    await connectDB();
    const { email, password, phone } = await req.json();

    // Allow login with either email or phone
    let customer;
    if (email) {
      customer = await Customer.findOne({ email }).populate('orgs').lean();
    } else if (phone) {
      customer = await Customer.findOne({ phone }).populate('orgs').lean();
    } else {
      return NextResponse.json({ 
        error: "Email or phone number required" 
      }, { status: 400 });
    }

    if (!customer) {
      return NextResponse.json({ 
        error: "Incorrect Login Details" 
      }, { status: 401 });
    }

    // Check if customer has a password hash
    if (!customer.hash) {
      return NextResponse.json({ 
        error: "Please set up your password first. Check your email for instructions." 
      }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, customer.hash);

    if (!isValid) {
      return NextResponse.json({ 
        error: "Incorrect Login Details" 
      }, { status: 401 });
    }

    // Check if account is locked
    if (customer.locked) {
      return NextResponse.json({ 
        error: "Account is locked. Please contact support." 
      }, { status: 401 });
    }

    // Create JWT token for mobile app
    const token = await new SignJWT({
      customerId: customer._id.toString(),
      email: customer.email,
      phone: customer.phone,
      name: customer.name,
      memberId: customer.memberId,
      orgs: customer.orgs ? customer.orgs.map(org => ({
        id: org._id.toString(),
        name: org.name
      })) : [],
      type: 'customer' // Distinguish from employee tokens
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d") // 30 days for mobile app
      .sign(SECRET_KEY);

    // Return customer data and token
    return NextResponse.json({
      success: true,
      token,
      customer: {
        id: customer._id.toString(),
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        memberId: customer.memberId,
        dob: customer.dob,
        gender: customer.gender,
        photo: customer.photo,
        orgs: customer.orgs ? customer.orgs.map(org => ({
          id: org._id.toString(),
          name: org.name
        })) : []
      }
    });

  } catch (error) {
    console.error("Customer login error:", error);
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}