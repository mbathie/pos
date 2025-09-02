import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { Org } from '@/models'
import { getEmployee } from '@/lib/auth'

export async function GET(request) {
  try {
    // Verify authentication
    const { employee } = await getEmployee()
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Connect to database
    await connectDB()
    
    // Get the organization's terms and conditions content
    const org = await Org.findById(employee.org._id).select('tandcContent').lean()
    
    return NextResponse.json({ 
      content: org?.tandcContent || null 
    })
  } catch (error) {
    console.error('Error fetching terms and conditions content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch terms and conditions content' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    // Verify authentication
    const { employee } = await getEmployee()
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to edit terms and conditions (admin or manager)
    if (!['ADMIN', 'MANAGER'].includes(employee.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Connect to database
    await connectDB()

    // Get the content from request body
    const { content } = await request.json()
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Update the organization's terms and conditions content
    const result = await Org.findByIdAndUpdate(
      employee.org._id,
      { 
        tandcContent: content,
        tandcUpdatedAt: new Date(),
        tandcUpdatedBy: employee._id
      },
      { new: true }
    )
    
    if (!result) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Terms and conditions updated successfully'
    })
  } catch (error) {
    console.error('Error updating terms and conditions content:', error)
    return NextResponse.json(
      { error: 'Failed to update terms and conditions content' },
      { status: 500 }
    )
  }
}