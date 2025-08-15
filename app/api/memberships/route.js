import { NextRequest, NextResponse } from 'next/server'
import { Membership } from '@/models'
import { connectDB } from '@/lib/mongoose'
import { getEmployee } from '@/lib/auth'

export async function GET(request) {
  try {
    // Authenticate the request
    const { employee } = await getEmployee()
    if (!employee) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 50
    
    // Build query - ensure we only get memberships for the employee's org
    let query = {
      org: employee.org._id
    }
    
    if (customerId) {
      query.customer = customerId
    }
    
    if (status) {
      query.status = status
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit
    
    // Find memberships with populated references
    const memberships = await Membership.find(query)
      .populate('customer', 'name email phone')
      .populate('product', 'name desc type')
      .populate('transaction') // Populate full transaction to get cart data
      .populate('org', 'name')
      .populate('location', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
    
    // Get total count for pagination
    const total = await Membership.countDocuments(query)
    
    return NextResponse.json({
      memberships,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    })
    
  } catch (error) {
    console.error('Error fetching memberships:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memberships' },
      { status: 500 }
    )
  }
}

// For creating new memberships (if needed later)
export async function POST(request) {
  try {
    // Authenticate the request
    const { employee } = await getEmployee()
    if (!employee) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    
    const membershipData = await request.json()
    
    // Ensure the membership is for the employee's org
    const membership = await Membership.create({
      ...membershipData,
      org: employee.org._id,
      location: employee.location?._id || membershipData.location
    })
    
    // Populate references for response
    const populatedMembership = await Membership.findById(membership._id)
      .populate('customer', 'name email')
      .populate('product', 'name desc type')
      .populate('transaction', '_id')
      .populate('org', 'name')
      .populate('location', 'name')
      .lean()
    
    return NextResponse.json(populatedMembership, { status: 201 })
    
  } catch (error) {
    console.error('Error creating membership:', error)
    return NextResponse.json(
      { error: 'Failed to create membership' },
      { status: 500 }
    )
  }
}