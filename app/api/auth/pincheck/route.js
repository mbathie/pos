import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongoose'
import { getEmployee } from '@/lib/auth'
import { Employee } from '@/models'
import { hasPermission } from '@/lib/permissions'

export async function POST(request) {
  try {
    const { pin, permission } = await request.json()

    if (!pin || !permission) {
      return NextResponse.json(
        { error: 'PIN and permission are required' },
        { status: 400 }
      )
    }

    await connectDB()
    
    // Get current employee to determine organization
    const { employee } = await getEmployee()
    
    if (!employee || !employee.org) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Find employee with matching PIN in the same organization
    const pinEmployee = await Employee.findOne({ 
      org: employee.org._id,
      pin: parseInt(pin)
    }).select('pin role name email')

    if (!pinEmployee) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 403 }
      )
    }

    // Check if employee has the required permission
    const empHasPermission = hasPermission(pinEmployee.role, permission)
    
    if (!empHasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions for custom discounts' },
        { status: 403 }
      )
    }

    // Employee found and has permission
    return NextResponse.json({
      success: true,
      user: {
        name: pinEmployee.name,
        email: pinEmployee.email,
        role: pinEmployee.role
      }
    })

  } catch (error) {
    console.error('Pin check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}