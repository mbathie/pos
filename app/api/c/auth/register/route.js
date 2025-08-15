import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcrypt";
import { connectDB } from "@/lib/mongoose";
import { Customer, Org, Location } from "@/models";

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(req) {
  try {
    await connectDB();
    const { 
      name, email, phone, password, dob, gender, 
      orgId, locationId, photo, signature, address, 
      nameParent, waiver 
    } = await req.json();

    // Validate required fields
    if (!name || !password || (!email && !phone)) {
      return NextResponse.json({ 
        error: "Name, password, and either email or phone are required" 
      }, { status: 400 });
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      $or: [
        { email: email || null },
        { phone: phone || null }
      ].filter(condition => condition.email || condition.phone)
    });

    if (existingCustomer) {
      return NextResponse.json({ 
        error: "An account with this email or phone already exists" 
      }, { status: 409 });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Get org from either orgId or locationId
    let orgs = [];
    let location = null;
    
    if (locationId) {
      // If locationId is provided, get the org from the location
      location = await Location.findById(locationId);
      if (location && location.orgId) {
        orgs = [location.orgId];
      }
    } else if (orgId) {
      // If orgId is directly provided
      const org = await Org.findById(orgId);
      if (org) {
        orgs = [orgId];
      }
    } else {
      // Get default org if no specific org or location provided
      const defaultOrg = await Org.findOne().limit(1);
      if (defaultOrg) {
        orgs = [defaultOrg._id];
      }
    }

    // Create new customer with waiver data
    const customer = new Customer({
      name,
      email: email || undefined,
      phone: phone || undefined,
      hash,
      dob: dob ? new Date(dob) : undefined,
      gender: gender || undefined,
      orgs,
      photo: photo || undefined,
      address: address || undefined,
      nameParent: nameParent || undefined,
      waiver: waiver && signature ? {
        agree: true,
        signature: signature,
        signedAt: new Date(),
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
        content: 'Standard liability waiver'
      } : undefined
    });

    await customer.save();

    // Populate orgs for response
    await customer.populate('orgs');

    // Create JWT token
    const token = await new SignJWT({
      customerId: customer._id.toString(),
      email: customer.email,
      phone: customer.phone,
      name: customer.name,
      memberId: customer.memberId,
      orgs: customer.orgs.map(org => ({
        id: org._id.toString(),
        name: org.name
      })),
      type: 'customer'
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(SECRET_KEY);

    // Return success response
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
        orgs: customer.orgs.map(org => ({
          id: org._id.toString(),
          name: org.name
        }))
      }
    });

  } catch (error) {
    console.error("Customer registration error:", error);
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