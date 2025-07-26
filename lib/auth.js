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
    
    console.log('JWT Payload:', payload)

    const employee = await Employee.findById(payload.employeeId)
      .populate({ path: "org", strictPopulate: false })
      .lean();
      
    console.log('Found employee:', employee ? employee.name : 'NOT FOUND')

    if (!employee)
      return { error: "User not found", status: 404 }

    // Check if account is locked
    if (employee.locked) {
      return { error: "Account locked", status: 401 }
    }

    // Remove sensitive fields manually
    const { hash, createdAt, updatedAt, deleted, ...safeEmployee } = employee

    // Handle selectedLocationId safely
    let selectedLocationId = null;
    if (payload.selectedLocationId && typeof payload.selectedLocationId === 'string' && payload.selectedLocationId.length === 24) {
      try {
        selectedLocationId = Types.ObjectId.createFromHexString(payload.selectedLocationId);
      } catch (error) {
        console.warn('Invalid selectedLocationId in JWT payload:', payload.selectedLocationId);
        selectedLocationId = null;
      }
    }

    return { 
      employee: {
        ...safeEmployee, 
        selectedLocationId
      }, 
      status: 200
    }
  } catch (error) {
    console.error(error)
    return { error: "Internal Server Error", status: 500 }
  }
}

