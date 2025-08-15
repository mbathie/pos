import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { cookies } from "next/headers"

// Check if PIN is needed when accessing /shop
export async function GET() {
  try {
    await connectDB()
    
    const { employee } = await getEmployee()
    if (!employee) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Check if employee has a PIN set
    const hasPinSet = employee.pin != null && employee.pin !== undefined
    
    // Check last PIN entry time from cookie
    const cookieStore = await cookies()
    const lastPinEntry = cookieStore.get('pinAuth')?.value
    
    let needsPinEntry = false
    
    if (hasPinSet && lastPinEntry) {
      // Check if more than 5 minutes have passed
      const lastEntryTime = new Date(lastPinEntry)
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
      
      needsPinEntry = lastEntryTime < fiveMinutesAgo
      
      console.log('PIN timing check:', {
        lastEntry: lastEntryTime.toISOString(),
        now: now.toISOString(),
        needsPinEntry
      })
    } else if (hasPinSet) {
      // Has PIN but no recent entry
      needsPinEntry = true
    }

    console.log('PIN check endpoint:', {
      employeeId: employee._id,
      hasPinSet,
      needsPinEntry,
      pin: employee.pin
    })

    return NextResponse.json({
      hasPinSet,
      needsPinEntry
    })

  } catch (error) {
    console.error('Error in PIN check:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}