import { NextRequest, NextResponse } from 'next/server'
import { getCustomer } from '@/lib/auth'
import { getMemberships } from '@/lib/memberships'

export async function GET(request) {
  try {
    // Authenticate the customer
    const { customer } = await getCustomer(request)
    if (!customer) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get all memberships for the authenticated customer
    const memberships = await getMemberships({ customerId: customer._id })
    
    // Add console logging to debug
    console.log('=== MEMBERSHIPS API DEBUG ===')
    console.log('Customer ID:', customer._id)
    console.log('Customer Name:', customer.name)
    console.log('Memberships found:', memberships?.length || 0)
    console.log('Memberships data:', JSON.stringify(memberships, null, 2))
    console.log('============================')
    
    // Format the response with additional customer-specific data
    const response = {
      success: true,
      memberships,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        memberId: customer.memberId
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error fetching customer memberships:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memberships' },
      { status: 500 }
    )
  }
}