import { cookies, headers } from "next/headers"
import { jwtVerify } from "jose"
import { connectDB } from "@/lib/mongoose"
import { Employee, Org, Customer } from "@/models"
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

    // Check if account is locked
    if (employee.locked) {
      return { error: "Account locked", status: 401 }
    }

    // Remove sensitive fields manually (but keep pin for checking if it's set)
    const { hash, deleted, ...safeEmployee } = employee

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

export async function getCustomer(req) {
  try {
    await connectDB()
    
    // Get authorization header
    const authHeader = req ? req.headers.get('authorization') : (await headers()).get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: "Unauthorized", status: 401 }
    }

    // Verify JWT token
    const token = authHeader.substring(7);
    let payload;
    try {
      const verified = await jwtVerify(token, SECRET_KEY);
      payload = verified.payload;
    } catch (error) {
      return { error: "Invalid token", status: 401 }
    }

    // Ensure it's a customer token
    if (payload.type !== 'customer') {
      return { error: "Invalid token type", status: 401 }
    }

    // Fetch customer with populated orgs
    const customer = await Customer.findById(payload.customerId)
      .populate('orgs')
      .lean();

    if (!customer) {
      return { error: "Customer not found", status: 404 }
    }

    // Remove sensitive fields and format response
    return { 
      customer: {
        id: customer._id.toString(),
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        memberId: customer.memberId,
        dob: customer.dob,
        gender: customer.gender,
        photo: customer.photo,
        address: customer.address,
        waiver: customer.waiver,
        assigned: customer.assigned,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        orgs: customer.orgs ? customer.orgs.map(org => ({
          id: org._id.toString(),
          _id: org._id,
          name: org.name
        })) : []
      },
      status: 200
    }
  } catch (error) {
    console.error("Customer auth error:", error)
    return { error: "Internal Server Error", status: 500 }
  }
}

