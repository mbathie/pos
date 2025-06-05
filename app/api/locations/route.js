import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Location } from "@/models"

export async function GET() {
  await connectDB()
  const { employee, error, status } = await getEmployee()

  if (error)
    return NextResponse.json({ error }, { status })

  const locations = await Location.find(
    { orgId: employee.orgId },
    { _id: 1, name: 1 }
  ).lean()

  return NextResponse.json(locations, { status: 200 })
}