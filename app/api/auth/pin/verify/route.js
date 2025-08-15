import { NextResponse } from "next/server"
import { SignJWT } from "jose"
import { cookies } from "next/headers"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Employee } from "@/models"

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET)

// Verify an existing PIN
export async function POST(req) {
  try {
    await connectDB()
    
    const { employee } = await getEmployee()
    if (!employee) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { pin } = await req.json()

    // Validate PIN format
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "Invalid PIN format" }, { status: 400 })
    }

    const pinNumber = parseInt(pin, 10)

    // First, check if the PIN matches the current employee
    if (employee.pin === pinNumber) {
      // Update lastPin timestamp in database
      const now = new Date()
      await Employee.findByIdAndUpdate(
        employee._id,
        { lastPin: now }
      )

      console.log('PIN verified successfully for current employee:', {
        employeeId: employee._id,
        lastPin: now.toISOString()
      })

      return NextResponse.json({
        success: true,
        message: 'PIN verified',
        employee: {
          _id: employee._id,
          name: employee.name,
          email: employee.email
        }
      })
    }

    // If PIN doesn't match current employee, look for another employee in the same org
    const otherEmployee = await Employee.findOne({
      org: employee.org._id,
      pin: pinNumber,
      $or: [
        { locked: null },
        { locked: { $exists: false } }
      ]
    }).populate('org').populate('location').lean()

    if (!otherEmployee) {
      console.log('PIN verification failed - no matching employee found:', {
        currentEmployeeId: employee._id,
        orgId: employee.org._id,
        provided: pinNumber
      })
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 })
    }

    // Found another employee with matching PIN - re-authenticate as that employee
    console.log('Switching to different employee with matching PIN:', {
      fromEmployeeId: employee._id,
      toEmployeeId: otherEmployee._id,
      orgId: employee.org._id
    })

    // Create new JWT token for the other employee (same logic as login)
    const token = await new SignJWT({
      selectedLocationId: otherEmployee.location._id.toString(),
      email: otherEmployee.email,
      employeeId: otherEmployee._id.toString(),
      orgId: otherEmployee.org._id.toString(),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1y")
      .sign(SECRET_KEY)

    const cookieStore = await cookies()

    // Set the new token cookie
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })

    // Update lastPin timestamp for the employee we're switching to
    const now = new Date()
    await Employee.findByIdAndUpdate(
      otherEmployee._id,
      { lastPin: now }
    )

    console.log('Successfully re-authenticated as different employee:', {
      employeeId: otherEmployee._id,
      lastPin: now.toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'PIN verified - switched employee',
      employee: {
        _id: otherEmployee._id,
        name: otherEmployee.name,
        email: otherEmployee.email
      },
      switched: true
    })

  } catch (error) {
    console.error('Error verifying PIN:', error)
    return NextResponse.json({ error: 'Failed to verify PIN' }, { status: 500 })
  }
}