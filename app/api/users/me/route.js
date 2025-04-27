import { cookies } from 'next/headers'
import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import prisma from "@/lib/db"

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET)

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { payload } = await jwtVerify(token.value, SECRET_KEY)

    const employee = await prisma.employee.findUnique({
      where: { id: payload.employeeId },
      omit: {
        hash: true, createdAt: true, updatedAt: true, deletedAt: true
      }
    });

    if (!employee)
      return NextResponse.json({ error: "User not found" }, { status: 404 })

    return NextResponse.json({ employee }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}