import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Org } from "@/models";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { orgId } = params;

    const org = await Org.findById(orgId).select('name logo settings');

    if (!org) {
      return NextResponse.json({ 
        success: false,
        error: "Organization not found" 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      org: {
        id: org._id.toString(),
        name: org.name,
        logo: org.logo,
        settings: org.settings
      }
    });

  } catch (error) {
    console.error("Org fetch error:", error);
    return NextResponse.json({ 
      success: false,
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}