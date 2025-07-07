import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Casual } from "@/models"

export async function GET(req) {
  await connectDB()
  const { employee } = await getEmployee()
  const orgId = employee.org._id

  const casuals = await Casual.find({ org: orgId })
    .populate("customer")
    .populate("product")
    .populate("location")
    // .populate("org")
    .populate("transaction")
    .sort({ start: -1 })

  return NextResponse.json(casuals)
}
