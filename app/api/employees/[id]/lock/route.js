import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Employee } from "@/models"

export async function POST(req, { params }) {
  await connectDB()
  const { employee: currentEmployee } = await getEmployee()
  
  if (!currentEmployee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const { action } = await req.json() // 'lock' or 'unlock'

    // Find the employee
    const employee = await Employee.findOne({ 
      _id: id, 
      org: currentEmployee.org 
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Prevent locking themselves
    if (employee._id.toString() === currentEmployee._id.toString()) {
      return NextResponse.json({ error: "Cannot lock your own account" }, { status: 400 })
    }

    let updateData = {}
    let message = ''

    if (action === 'lock') {
      updateData.locked = new Date()
      message = 'Account locked successfully'
    } else if (action === 'unlock') {
      updateData = { $unset: { locked: 1 } }
      message = 'Account unlocked successfully'
    } else {
      return NextResponse.json({ error: "Invalid action. Use 'lock' or 'unlock'" }, { status: 400 })
    }

    // Update the employee
    await Employee.findByIdAndUpdate(id, updateData)

    return NextResponse.json({
      success: true,
      message,
      action
    }, { status: 200 })

  } catch (error) {
    console.error('Error updating employee lock status:', error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 