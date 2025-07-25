import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Employee } from "@/models"
import bcrypt from 'bcrypt'

export async function POST(req) {
  await connectDB()
  const { employee: currentEmployee } = await getEmployee()
  
  if (!currentEmployee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, email, role, locationId } = await req.json()

    if (!name || !email || !role || !locationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if employee already exists
    if (await Employee.findOne({ email })) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8)
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    const newEmployee = await Employee.create({
      name,
      email,
      role,
      location: locationId,
      org: currentEmployee.org,
      hash: hashedPassword
    })

    // Populate the location for the response
    await newEmployee.populate({ path: 'location', select: 'name' })

    // Return the employee with the temporary password (for display purposes)
    const employeeWithPassword = {
      ...newEmployee.toObject(),
      password: tempPassword
    }

    return NextResponse.json(employeeWithPassword, { status: 201 })
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  await connectDB();
  const { employee } = await getEmployee();

  try {
    const employees = await Employee.find({ org: employee.org })
      .populate({ path: 'location', select: 'name' })
      .lean();
    console.log(employees)
    return NextResponse.json(employees);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}