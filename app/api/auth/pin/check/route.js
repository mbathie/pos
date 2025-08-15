import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"

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
    
    let needsPinEntry = false
    
    if (hasPinSet) {
      if (!employee.lastPin) {
        // Has PIN but never entered it (or lastPin not set)
        needsPinEntry = true
        console.log('PIN required - no lastPin timestamp found')
      } else {
        // Check if more than 5 minutes have passed since last PIN entry
        const lastEntryTime = new Date(employee.lastPin)
        const now = new Date()
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
        
        needsPinEntry = lastEntryTime < fiveMinutesAgo
        
        console.log('PIN timing check:', {
          lastEntry: lastEntryTime.toISOString(),
          now: now.toISOString(),
          fiveMinutesAgo: fiveMinutesAgo.toISOString(),
          needsPinEntry
        })
      }
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