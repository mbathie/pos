import { cookies } from 'next/headers'
import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import { connectDB } from "@/lib/mongoose"
import { Employee } from "@/models"

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET)

export async function GET() {
  try {
    await connectDB()
    const cookieStore = await cookies()
    const token = cookieStore.get('token')

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { payload } = await jwtVerify(token.value, SECRET_KEY)

    const employee = await Employee.findById(payload.employeeId)
      .populate({ path: "location", select: "name" })
      .lean()

    if (!employee)
      return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { hash, createdAt, updatedAt, deleted, ...safeEmployee } = employee

    return NextResponse.json({ employee: safeEmployee }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}