import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { Employee } from "@/models"

export async function GET(req, { params }) {
  await connectDB()
  
  try {
    const { id } = await params
    
    // Validate MongoDB ObjectId format
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ error: "Invalid employee ID" }, { status: 400 })
    }
    
    const employee = await Employee.findById(id)
      .populate({ path: 'location', select: 'name' })
      .lean()

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Return only safe employee data for setup page (no sensitive fields)
    const safeEmployee = {
      _id: employee._id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      location: employee.location,
      hasPassword: !!employee.hash, // Indicate if password is already set
      locked: employee.locked // Include lock status for session checking
    }
    
    return NextResponse.json(safeEmployee, { status: 200 })
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 