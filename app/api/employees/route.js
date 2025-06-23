import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Employee } from "@/models"

export async function POST(req) {
  // await connectDB()
  // const { employee } = await getEmployee()
  // const { name, email, phone } = await req.json()

  // if (await Customer.findOne({ email }))
  //   return NextResponse.json({ error: 'email exists', exists: true }, { status: 400 });

  // try {
  //   const customer = await Customer.create({
  //     name, email, phone,
  //     orgs: [employee.orgId],
  //   })
  //   return NextResponse.json(customer, { status: 201 })
  // } catch (error) {
  //   return NextResponse.json({ error: error.message }, { status: 500 })
  // }
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