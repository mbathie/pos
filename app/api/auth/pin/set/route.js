import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Employee } from "@/models"
import { cookies } from "next/headers"

// Set a new PIN for the employee
export async function POST(req) {
  try {
    await connectDB()
    
    const { employee } = await getEmployee()
    if (!employee) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { pin } = await req.json()

    // Validate PIN
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 })
    }

    const pinNumber = parseInt(pin, 10)

    // Check if PIN is already used by another employee in the org
    const existingEmployee = await Employee.findOne({
      org: employee.org._id,
      pin: pinNumber,
      _id: { $ne: employee._id }
    })

    if (existingEmployee) {
      return NextResponse.json({ error: "This PIN is already in use" }, { status: 400 })
    }

    // Update the employee's PIN
    const updated = await Employee.findByIdAndUpdate(
      employee._id,
      { pin: pinNumber },
      { new: true }
    )

    console.log('PIN set:', {
      employeeId: employee._id,
      pinSet: pinNumber,
      updated: !!updated
    })

    // Set cookie to track PIN authentication time
    const cookieStore = await cookies()
    const now = new Date()
    cookieStore.set('pinAuth', now.toISOString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    })

    return NextResponse.json({
      success: true,
      message: 'PIN set successfully'
    })

  } catch (error) {
    console.error('Error setting PIN:', error)
    return NextResponse.json({ error: 'Failed to set PIN' }, { status: 500 })
  }
}