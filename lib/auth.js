import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { connectDB } from "@/lib/mongoose"
import { Employee, Org } from "@/models"
import { Types } from "mongoose";

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET)

export async function getEmployee() {
  try {
    await connectDB()
    const cookieStore = await cookies()
    const token = cookieStore.get("token")

    if (!token) {
      return { error: "Unauthorized", status: 401 }
    }

    const { payload } = await jwtVerify(token.value, SECRET_KEY)

    const employee = await Employee.findById(payload.employeeId)
      .populate({ path: "org", strictPopulate: false })
      .lean();

    if (!employee)
      return { error: "User not found", status: 404 }

    // Remove sensitive fields manually
    const { hash, createdAt, updatedAt, deleted, ...safeEmployee } = employee

    return { 
      employee: {
        ...safeEmployee, 
        selectedLocationId: Types.ObjectId.createFromHexString(payload.selectedLocationId)
      }, 
      status: 200
    }
  } catch (error) {
    console.error(error)
    return { error: "Internal Server Error", status: 500 }
  }
}