import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Employee } from "@/models"

export async function PUT(req, { params }) {
  await connectDB()
  const { employee: currentEmployee } = await getEmployee()
  
  if (!currentEmployee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { name, email, role } = body

    if (!name || !email || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if email is already taken by another employee
    const existingEmployee = await Employee.findOne({ 
      email, 
      _id: { $ne: id },
      org: currentEmployee.org 
    })
    
    if (existingEmployee) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const updatedEmployee = await Employee.findOneAndUpdate(
      { _id: id, org: currentEmployee.org },
      { 
        name, 
        email, 
        role 
      },
      { 
        new: true,
        runValidators: true
      }
    )

    if (!updatedEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json(updatedEmployee, { status: 200 })
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}