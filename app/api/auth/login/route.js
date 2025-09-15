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

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const employee = await Employee.findOne({ email }).populate('org').populate('location').lean();
    // console.log(employee)

    if (!employee) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if employee has a password hash
    if (!employee.hash) {
      console.error('Employee found but no password hash:', employee.email);
      return NextResponse.json({ error: "Account not properly configured" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, employee.hash);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if account is locked
    if (employee.locked) {
      return NextResponse.json({ error: "Account locked" }, { status: 401 });
    }

    // Get or generate browser ID
    const browserId = await getOrCreateBrowserId();
    let selectedLocationId = null;
    
    // Check if this browser is tied to a specific location
    let browserLocation = await Location.findOne({
      browser: browserId,
      org: employee.org._id
    });
    
    if (browserLocation) {
      selectedLocationId = browserLocation._id.toString();
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
        // Update the location with the browser ID
        await Location.findByIdAndUpdate(oldestLocation._id, {
          browser: browserId
        });
        
        selectedLocationId = oldestLocation._id.toString();
        
        console.log('🖥️ Login: Assigned browser to oldest location:', {
          browserId,
          locationId: selectedLocationId,
          locationName: oldestLocation.name
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