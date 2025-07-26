import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { Employee } from "@/models"
import bcrypt from 'bcrypt'

export async function POST(req, { params }) {
  await connectDB()
  
  try {
    const { id } = await params
    const { password, pin } = await req.json()

    if (!password || !pin) {
      return NextResponse.json({ error: 'Password and PIN are required' }, { status: 400 })
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
    }

    // Find the employee
    const employee = await Employee.findById(id)
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Check if password is already set
    if (employee.hash) {
      return NextResponse.json({ error: 'Password already set for this employee' }, { status: 400 })
    }

    // Check if PIN is unique among employees in this organization
    const existingEmployeeWithPin = await Employee.findOne({
      org: employee.org,
      pin: pin,
      _id: { $ne: id } // Exclude current employee
    })

    if (existingEmployeeWithPin) {
      return NextResponse.json({ error: 'PIN is already in use by another employee in this organization' }, { status: 400 })
    }

    // Hash the password but store PIN as plain text
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update employee with new password and PIN
    await Employee.findByIdAndUpdate(id, {
      hash: hashedPassword,
      pin: pin, // Store PIN as plain text
      passwordSetAt: new Date()
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Password and PIN set successfully' 
    }, { status: 200 })

  } catch (error) {
    console.error('Error setting password:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 