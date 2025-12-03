import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Org } from "@/models"

export async function POST() {
  await connectDB()
  const { employee, error, status } = await getEmployee()

  if (error)
    return NextResponse.json({ error }, { status })

  await Org.findByIdAndUpdate(employee.org._id, { posSetupComplete: true })

  return NextResponse.json({ success: true }, { status: 200 })
}
