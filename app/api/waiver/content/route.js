import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { Org, Employee } from '@/models'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET)

export async function GET(request) {
  try {
    // Connect to database
    await connectDB()
    
    // Verify authentication
    const cookieStore = await cookies()
    const token = cookieStore.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { payload } = await jwtVerify(token.value, SECRET_KEY)
    
    // Get the organization's waiver content
    const org = await Org.findById(payload.orgId).select('waiverContent').lean()
    
    return NextResponse.json({ 
      content: org?.waiverContent || null 
    })
  } catch (error) {
    console.error('Error fetching waiver content:', error)
    return NextResponse.json(
      { error: 'Failed to fetch waiver content' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    // Connect to database
    await connectDB()
    
    // Verify authentication
    const cookieStore = await cookies()
    const token = cookieStore.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { payload } = await jwtVerify(token.value, SECRET_KEY)

    // Check if user has permission to edit waiver (admin or manager)
    const employee = await Employee.findById(payload.employeeId).lean()
    if (!employee || !['ADMIN', 'MANAGER'].includes(employee.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the content from request body
    const { content } = await request.json()
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Update the organization's waiver content
    const result = await Org.findByIdAndUpdate(
      payload.orgId,
      { 
        waiverContent: content,
        waiverUpdatedAt: new Date(),
        waiverUpdatedBy: payload.employeeId
      },
      { new: true }
    )
    
    if (!result) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Waiver content updated successfully' 
    })
  } catch (error) {
    console.error('Error saving waiver content:', error)
    return NextResponse.json(
      { error: 'Failed to save waiver content' },
      { status: 500 }
    )
  }
}