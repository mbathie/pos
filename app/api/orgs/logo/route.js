import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { Org } from "@/models"
import { getEmployee } from "@/lib/auth"

export async function POST(req) {
  await connectDB()

  try {
    const { logo } = await req.json()
    const { employee } = await getEmployee()

    if (!employee || !employee.org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updatedOrg = await Org.findByIdAndUpdate(
      employee.org._id,
      { logo },
      { new: true }
    )

    return NextResponse.json({ logo: updatedOrg.logo }, { status: 200 })
  } catch (error) {
    console.error("Error updating logo:", error)
    return NextResponse.json({ error: "Failed to update logo" }, { status: 500 })
  }
}

export async function DELETE(req) {
  await connectDB()

  try {
    const { employee } = await getEmployee()

    if (!employee || !employee.org) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updatedOrg = await Org.findByIdAndUpdate(
      employee.org._id,
      { $unset: { logo: "" } },
      { new: true }
    )

    return NextResponse.json({ org: updatedOrg }, { status: 200 })
  } catch (error) {
    console.error("Error removing logo:", error)
    return NextResponse.json({ error: "Failed to remove logo" }, { status: 500 })
  }
}