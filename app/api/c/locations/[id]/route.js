import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Location, Org } from "@/models";

export async function GET(req, { params }) {
  try {
    await connectDB();
    
    const { id: locationId } = await params;
    
    // Fetch location with populated org
    const location = await Location.findById(locationId)
      .populate('orgId')
      .lean();

    if (!location) {
      return NextResponse.json({ 
        error: "Location not found" 
      }, { status: 404 });
    }

    // Return location data
    return NextResponse.json({
      success: true,
      location: {
        id: location._id.toString(),
        name: location.name,
        address: location.address,
        org: location.orgId ? {
          id: location.orgId._id.toString(),
          name: location.orgId.name
        } : null
      }
    });

  } catch (error) {
    console.error("Location fetch error:", error);
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}