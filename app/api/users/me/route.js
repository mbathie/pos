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

    console.log('🔍 /api/users/me - Checking token:', {
      tokenExists: !!token,
      timestamp: new Date().toISOString()
    });

    if (!token) {
      console.log('❌ /api/users/me - No token found in cookies');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { payload } = await jwtVerify(token.value, SECRET_KEY)

    console.log('📍 /api/users/me - JWT payload:', {
      selectedLocationId: payload.selectedLocationId,
      employeeId: payload.employeeId
    });

    const employee = await Employee.findById(payload.employeeId)
      .populate({ path: "org", select: "name stripeAccountId" })
      .lean()

    if (!employee)
      return NextResponse.json({ error: "User not found" }, { status: 404 })

    const { hash, createdAt, updatedAt, deleted, location, ...safeEmployee } = employee

    // Add selectedLocationId from JWT to the employee object
    const employeeWithSelectedLocation = {
      ...safeEmployee,
      selectedLocationId: payload.selectedLocationId || null
    }
    
    console.log('📍 /api/users/me - Returning employee:', {
      selectedLocationId: employeeWithSelectedLocation.selectedLocationId,
      employeeId: employeeWithSelectedLocation._id
    });

    return NextResponse.json({ employee: employeeWithSelectedLocation }, { status: 200 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}