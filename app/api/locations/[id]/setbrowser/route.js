import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Location } from "@/models";
import { getEmployee } from "@/lib/auth";
import { 
  getOrCreateBrowserId,
  updateAuth,
  deletePosLocationCookie,
  getBrowserId
} from "@/lib/cookies";

export async function POST(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    
    // Authenticate user
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or generate browser ID
    const browserId = await getOrCreateBrowserId();

    // Clear any existing browser associations for this browser ID
    await Location.updateMany(
      { browser: browserId, org: employee.org._id },
      { $unset: { browser: 1 } }
    );

    // Update the selected location with the browser ID
    const location = await Location.findOneAndUpdate(
      { _id: id, org: employee.org._id },
      { browser: browserId },
      { new: true }
    );

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Update auth with new location and set all cookies (including updated JWT)
    await updateAuth({ 
      employee, 
      locationId: id, 
      browserId 
    });

    console.log('🖥️ Browser location set:', {
      locationId: id,
      locationName: location.name,
      browserId: browserId
    });

    return NextResponse.json({ 
      success: true,
      locationId: id,
      browserId: browserId,
      message: "This browser is now tied to " + location.name
    });

  } catch (error) {
    console.error('Error setting browser location:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { id } = params;
    
    // Authenticate user
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get browser ID from cookie
    const browserId = await getBrowserId();

    if (browserId) {
      // Remove browser association from the location
      await Location.findOneAndUpdate(
        { _id: id, org: employee.org._id },
        { $unset: { browser: 1 } }
      );
    }

    // Remove the pos_location_id cookie
    await deletePosLocationCookie();

    console.log('🖥️ Browser location cleared for location:', id);

    return NextResponse.json({ 
      success: true,
      message: "Browser location association cleared"
    });

  } catch (error) {
    console.error('Error clearing browser location:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}