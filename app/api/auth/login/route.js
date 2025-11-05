import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { connectDB } from "@/lib/mongoose";
import { Employee, Location } from "@/models";
import { 
  getOrCreateBrowserId, 
  updateAuth
} from "@/lib/cookies";

export async function POST(req) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    console.log('🔐 Login attempt:', { email, timestamp: new Date().toISOString() });

    // Validate required fields
    if (!email || !password) {
      console.log('❌ Missing credentials');
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const employee = await Employee.findOne({ email }).populate('org').populate('location').lean();

    if (!employee) {
      console.log('❌ Employee not found:', email);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    console.log('✅ Employee found:', { id: employee._id, email: employee.email });

    // Check if employee has a password hash
    if (!employee.hash) {
      console.error('❌ Employee found but no password hash:', employee.email);
      return NextResponse.json({ error: "Account not properly configured" }, { status: 401 });
    }

    console.log('🔑 Comparing password...');
    const isValid = await bcrypt.compare(password, employee.hash);

    if (!isValid) {
      console.log('❌ Password mismatch');
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    console.log('✅ Password valid');

    // Check if account is locked
    if (employee.locked) {
      console.log('❌ Account locked');
      return NextResponse.json({ error: "Account locked" }, { status: 401 });
    }

    // Get or generate browser ID
    const browserId = await getOrCreateBrowserId();
    let selectedLocationId = null;

    // Check if this browser is already registered as a device at a location
    let browserLocation = await Location.findOne({
      'devices.browserId': browserId,
      org: employee.org._id
    });

    if (browserLocation) {
      selectedLocationId = browserLocation._id.toString();

      // Update the device's lastSeen timestamp
      const device = browserLocation.devices.find(d => d.browserId === browserId);
      if (device) {
        device.lastSeen = new Date();
        device.metadata = {
          ...device.metadata,
          userAgent: req.headers.get('user-agent')
        };
        await browserLocation.save();
      }

      console.log('🖥️ Login: Using existing browser-tied location:', {
        browserId,
        locationId: selectedLocationId,
        locationName: browserLocation.name
      });
    } else {
      // No browser-tied location found, assign the oldest location
      const oldestLocation = await Location.findOne({
        org: employee.org._id
      }).sort({ createdAt: 1 }); // Sort by createdAt ascending (oldest first)

      if (oldestLocation) {
        // Add this browser as a new device to the location
        if (!oldestLocation.devices) {
          oldestLocation.devices = [];
        }

        oldestLocation.devices.push({
          browserId,
          name: `Device ${oldestLocation.devices.length + 1}`,
          lastSeen: new Date(),
          metadata: {
            userAgent: req.headers.get('user-agent')
          }
        });

        await oldestLocation.save();

        selectedLocationId = oldestLocation._id.toString();

        console.log('🖥️ Login: Assigned browser to oldest location and registered as device:', {
          browserId,
          locationId: selectedLocationId,
          locationName: oldestLocation.name,
          deviceCount: oldestLocation.devices.length
        });
      }
    }
    
    // Fallback to any location if needed
    if (!selectedLocationId && employee.location) {
      selectedLocationId = employee.location._id.toString();
    }

    // Update auth with location and set all cookies
    await updateAuth({ 
      employee, 
      locationId: selectedLocationId, 
      browserId 
    });

    return NextResponse.json({ error: false, message: "Logged in" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}