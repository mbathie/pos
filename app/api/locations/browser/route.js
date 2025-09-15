import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongoose";
import { Location } from "@/models";
import { getEmployee } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();
    
    // Authenticate user
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get browser ID from cookie
    const cookieStore = await cookies();
    const browserId = cookieStore.get('browser_id')?.value;
    const posLocationId = cookieStore.get('pos_location_id')?.value;

    if (!browserId) {
      return NextResponse.json({ 
        browserId: null,
        locationId: null,
        message: "No browser ID found"
      });
    }

    // Find location with this browser ID
    const location = await Location.findOne({
      browser: browserId,
      org: employee.org._id
    });

    if (location) {
      console.log('🖥️ Found browser-tied location:', {
        locationId: location._id,
        locationName: location.name,
        browserId: browserId
      });

      return NextResponse.json({ 
        browserId: browserId,
        locationId: location._id.toString(),
        locationName: location.name,
        message: `This browser is tied to ${location.name}`
      });
    }

    // If no location found but we have a pos_location_id cookie, clear it
    if (posLocationId) {
      cookieStore.delete("pos_location_id");
    }

    return NextResponse.json({ 
      browserId: browserId,
      locationId: null,
      message: "Browser ID exists but not tied to any location"
    });

  } catch (error) {
    console.error('Error getting browser location:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}