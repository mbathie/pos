import { NextResponse } from "next/server"
import { SignJWT } from "jose"
import { cookies } from "next/headers"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Employee } from "@/models"

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET)

export async function POST(req) {
  try {
    await connectDB()
    const { pin, confirmPin, action } = await req.json()

    // Get current employee from session
    const { employee: currentEmployee } = await getEmployee()
    
    if (!currentEmployee) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Handle setting a new pin
    if (action === 'set') {
      if (!pin || !confirmPin || pin.length !== 4 || confirmPin.length !== 4 || !/^\d{4}$/.test(pin) || !/^\d{4}$/.test(confirmPin)) {
        return NextResponse.json({ error: 'PIN must be 4 digits' }, { status: 400 })
      }

      if (pin !== confirmPin) {
        return NextResponse.json({ error: 'PINs do not match' }, { status: 400 })
      }

      // Convert PIN to integer
      const pinNumber = parseInt(pin, 10)

      // Check if PIN is already used by another employee in the organization
      const existingEmployee = await Employee.findOne({
        org: currentEmployee.org._id,
        pin: pinNumber,
        _id: { $ne: currentEmployee._id }
      })

      if (existingEmployee) {
        return NextResponse.json({ error: 'PIN already in use by another employee' }, { status: 400 })
      }

      // Update the employee with the new PIN
      await Employee.findByIdAndUpdate(currentEmployee._id, { pin: pinNumber })

      const now = new Date()

      return NextResponse.json({
        success: true,
        message: 'PIN set successfully',
        pinAuth: now,
        employee: {
          _id: currentEmployee._id,
          name: currentEmployee.name,
          email: currentEmployee.email,
          role: currentEmployee.role,
          hasPinSet: true
        }
      })
    }

    // Handle verifying an existing pin
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'Invalid PIN format' }, { status: 400 })
    }

    // Convert PIN to integer
    const pinNumber = parseInt(pin, 10)

    // Look up employee by PIN in the same organization
    const pinEmployee = await Employee.findOne({
      org: currentEmployee.org._id,
      pin: pinNumber
    }).populate('org')

    if (!pinEmployee) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    const now = new Date()

    // Check if it's the same employee
    if (pinEmployee._id.toString() === currentEmployee._id.toString()) {
      // Same employee - return data for client to update pinAuth timestamp
      return NextResponse.json({ 
        success: true, 
        message: 'PIN verified',
        sameEmployee: true,
        pinAuth: now,
        employee: {
          _id: currentEmployee._id,
          name: currentEmployee.name,
          email: currentEmployee.email,
          role: currentEmployee.role,
          hasPinSet: true
        }
      })
    } else {
      // Different employee - switch authentication
      const selectedLocationId = currentEmployee.selectedLocationId?.toString() || pinEmployee.location?.toString() || null;
      
      console.log('Creating JWT with selectedLocationId:', selectedLocationId)
      
      const token = await new SignJWT({
        selectedLocationId,
        email: pinEmployee.email,
        employeeId: pinEmployee._id.toString(),
        orgId: pinEmployee.org._id.toString(),
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1y")
        .sign(SECRET_KEY)

      const cookieStore = await cookies()
      
      cookieStore.set("token", token, {
        httpOnly: true,
        secure: true,
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Employee switched successfully',
        sameEmployee: false,
        pinAuth: now,
        employee: {
          _id: pinEmployee._id,
          name: pinEmployee.name,
          email: pinEmployee.email,
          role: pinEmployee.role,
          org: pinEmployee.org,
          selectedLocationId: currentEmployee.selectedLocationId || pinEmployee.location?.toString(),
          hasPinSet: true
        }
      })
    }

  } catch (error) {
    console.error('Error in PIN authentication:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// Add GET endpoint to check if current employee has a pin set
export async function GET() {
  try {
    await connectDB()
    
    const { employee: currentEmployee } = await getEmployee()
    
    if (!currentEmployee) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const hasPinSet = currentEmployee.pin != null

    return NextResponse.json({
      hasPinSet,
      employee: {
        _id: currentEmployee._id,
        name: currentEmployee.name,
        email: currentEmployee.email,
        role: currentEmployee.role
      }
    })

  } catch (error) {
    console.error('Error checking pin status:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 