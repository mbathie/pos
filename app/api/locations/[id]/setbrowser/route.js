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

    // Find the location
    const location = await Location.findOne({
      _id: id,
      org: employee.org._id
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Check if device already exists in this location
    const existingDeviceIndex = location.devices.findIndex(
      d => d.browserId === browserId
    );

    if (existingDeviceIndex >= 0) {
      // Update last seen
      location.devices[existingDeviceIndex].lastSeen = new Date();
    } else {
      // Add new device to this location
      location.devices.push({
        browserId,
        name: `Device ${location.devices.length + 1}`,
        lastSeen: new Date(),
        metadata: {
          userAgent: req.headers.get('user-agent')
        }
      });
    }

    await location.save();

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
    const { id } = await params;

    // Authenticate user
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get browser ID from cookie
    const browserId = await getBrowserId();

    if (browserId) {
      // Find the location and remove the device with this browserId
      const location = await Location.findOne({
        _id: id,
        org: employee.org._id
      });

      if (location) {
        location.devices = location.devices.filter(
          d => d.browserId !== browserId
        );
        await location.save();
      }
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