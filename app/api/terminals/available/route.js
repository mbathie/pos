import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { getEmployee } from '@/lib/auth'
import { Terminal } from '@/models'

export async function GET() {
  try {
    await connectDB()
    const { employee, error, status } = await getEmployee()

    if (error) {
      return NextResponse.json({ error }, { status })
    }

    // Get terminals for the employee's current selected location
    // If no selectedLocationId, return all terminals for the org
    const query = { 
      org: employee.org._id,
      status: { $in: ['online', 'offline'] } // Include both online and offline terminals
    }
    
    // Only filter by location if selectedLocationId is available
    if (employee.selectedLocationId) {
      query.location = employee.selectedLocationId
    }
    
    console.log('🔍 Searching for terminals with query:', query)
    
    const terminals = await Terminal.find(query)
    .populate([
      { path: 'location', select: 'name' }
    ])
    .lean()

    // Add a flag to indicate which terminals are currently available for payment
    const terminalsWithAvailability = terminals.map(terminal => ({
      ...terminal,
      availableForPayment: terminal.status === 'online',
      displayName: `${terminal.label} (${terminal.type === 'physical' ? terminal.deviceType || 'Physical' : 'Simulated'})`
    }))

    return NextResponse.json(terminalsWithAvailability, { status: 200 })
  } catch (error) {
    console.error('Error fetching available terminals:', error)
    return NextResponse.json({ error: 'Failed to fetch available terminals' }, { status: 500 })
  }
} 