import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Employee, Org } from "@/models"
import { sendNewEmployeeEmail } from "@/lib/mailer"

export async function POST(req, { params }) {
  await connectDB()
  const { employee: currentEmployee } = await getEmployee()
  
  if (!currentEmployee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    // Find the employee
    const employee = await Employee.findOne({ 
      _id: id, 
      org: currentEmployee.org 
    }).populate({ path: 'location', select: 'name' })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    // Clear password and PIN to reset account
    await Employee.findByIdAndUpdate(id, {
      $unset: { 
        hash: 1, 
        pin: 1,
        passwordSetAt: 1
      }
    })

    // Get organization name for email
    const org = await Org.findById(currentEmployee.org).select('name').lean()
    const orgName = org?.name || 'Your Organization'

    // Send welcome email with setup link
    const emailResult = await sendNewEmployeeEmail(
      employee.email, 
      employee.name, 
      employee._id.toString(), 
      orgName
    )

    if (emailResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Setup email sent successfully',
        previewUrl: emailResult.previewUrl
      }, { status: 200 })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to send email'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error re-sending email:', error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 