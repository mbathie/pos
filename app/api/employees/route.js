import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Employee, Org } from "@/models"
import bcrypt from 'bcrypt'
import { sendNewEmployeeEmail } from "@/lib/email/employee"

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

    const newEmployee = await Employee.create({
      name,
      email,
      role,
      location: locationId,
      org: currentEmployee.org,
      // No hash or pin initially - will be set during setup
    })

    // Populate the location for the response
    await newEmployee.populate({ path: 'location', select: 'name' })

    // Get organization name for email
    const org = await Org.findById(currentEmployee.org).select('name').lean()
    const orgName = org?.name || 'Your Organization'

    // Send welcome email with setup link
    try {
      const emailResult = await sendNewEmployeeEmail(email, name, newEmployee._id.toString(), orgName);
      if (emailResult.success) {
        console.log('Welcome email sent successfully:', emailResult.previewUrl);
      } else {
        console.error('Failed to send welcome email:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail the employee creation if email fails
    }

    // Return the employee without any password info
    return NextResponse.json(newEmployee, { status: 201 })
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