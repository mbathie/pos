import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Employee } from "@/models"

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

    // Check if the PIN matches
    if (employee.pin !== pinNumber) {
      console.log('PIN verification failed:', {
        employeeId: employee._id,
        provided: pinNumber,
        expected: employee.pin
      })
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 })
    }

    // Update lastPin timestamp in database
    const now = new Date()
    await Employee.findByIdAndUpdate(
      employee._id,
      { lastPin: now }
    )

    console.log('PIN verified successfully:', {
      employeeId: employee._id,
      lastPin: now.toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'PIN verified'
    })

  } catch (error) {
    console.error('Error verifying PIN:', error)
    return NextResponse.json({ error: 'Failed to verify PIN' }, { status: 500 })
  }
}