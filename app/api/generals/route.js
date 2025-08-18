import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { General } from "@/models"

export async function GET(req) {
  await connectDB()
  const { employee } = await getEmployee()
  const orgId = employee.org._id

  const generals = await General.find({ org: orgId, location: employee.selectedLocationId })
    .populate("customer")
    .populate("product")
    .populate("location")
    .populate("transaction")
    .sort({ start: -1 })

  return NextResponse.json(generals)
}
