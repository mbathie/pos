import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { cookies } from "next/headers"

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

    console.log('PIN verified successfully:', {
      employeeId: employee._id
    })

    // Update PIN authentication time in cookie
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
      message: 'PIN verified'
    })

  } catch (error) {
    console.error('Error verifying PIN:', error)
    return NextResponse.json({ error: 'Failed to verify PIN' }, { status: 500 })
  }
}