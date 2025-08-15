import { NextRequest, NextResponse } from 'next/server'
import { getEmployee } from '@/lib/auth'
import { getMemberships, createMembership } from '@/lib/memberships'

export async function GET(request, { params }) {
  try {
    // Authenticate the request
    const { employee } = await getEmployee()
    if (!employee) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { id: customerId } = await params
    
    // Use the shared memberships library
    const memberships = await getMemberships({ customerId })
    
    // Filter by org to ensure employee can only see memberships for their org
    const filteredMemberships = memberships.filter(m => 
      m.org && m.org._id.toString() === employee.org._id.toString()
    )
    
    return NextResponse.json({ memberships: filteredMemberships })
    
  } catch (error) {
    console.error('Error fetching memberships:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memberships' },
      { status: 500 }
    )
  }
}

// For creating new memberships for a specific customer
export async function POST(request, { params }) {
  try {
    // Authenticate the request
    const { employee } = await getEmployee()
    if (!employee) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { id: customerId } = await params
    const membershipData = await request.json()
    
    // Use the shared memberships library
    const membership = await createMembership({
      customerId,
      orgId: employee.org._id,
      locationId: employee.location?._id || membershipData.location,
      membershipData
    })
    
    return NextResponse.json(membership, { status: 201 })
    
  } catch (error) {
    console.error('Error creating membership:', error)
    return NextResponse.json(
      { error: 'Failed to create membership' },
      { status: 500 }
    )
  }
}