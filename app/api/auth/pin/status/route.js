import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"

// Simple status check - does employee have a PIN or not
export async function GET() {
  try {
    await connectDB()
    
    const { employee } = await getEmployee()
    if (!employee) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const hasPinSet = employee.pin != null && employee.pin !== undefined

    console.log('PIN status endpoint:', {
      employeeId: employee._id,
      hasPinSet,
      pinValue: employee.pin
    })

    return NextResponse.json({ hasPinSet })

  } catch (error) {
    console.error('Error checking PIN status:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}