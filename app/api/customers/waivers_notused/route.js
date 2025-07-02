import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Customer } from "@/models"

export async function GET(req) {
  await connectDB()
  const { employee } = await getEmployee()

  console.log(employee.org._id)

  const twoHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const customers = await Customer.find({
    orgs: employee.org._id,
    createdAt: { $gte: twoHoursAgo },
    assigned: false,
    "waiver.agree": true,
  });

  return NextResponse.json(customers)
}