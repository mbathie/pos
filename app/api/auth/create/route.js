import { NextResponse } from "next/server"
import { SignJWT } from "jose"
import bcrypt from "bcrypt"
import { connectDB } from "@/lib/mongoose"
import { Org, Location, Employee } from "@/models"

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET)

export async function POST(req) {
  try {
    await connectDB()
    const { email, password, name, nameEmployee, phone } = await req.json()

    // Input validation
    if (!email || !password || !name || !nameEmployee || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if the organization already exists
    const existingOrg = await Org.findOne({ name, deleted: { $ne: true } })
    if (existingOrg)
      return NextResponse.json({ error: "Organization already exists" }, { status: 401 })

    // Check if the employee already exists
    const existingEmployee = await Employee.findOne({ email })
    if (existingEmployee)
      return NextResponse.json({ error: "Employee with this email already exists" }, { status: 401 })

    const hash = await bcrypt.hash(password, 10)

    const org = await Org.create({ name, phone, deleted: false })
    const location = await Location.create({ name: "Main HQ", orgId: org._id, deleted: false })
    const employee = await Employee.create({
      name: nameEmployee,
      email,
      hash,
      orgId: org._id,
      locationId: location._id,
      role: "ADMIN",
    })

    const token = await new SignJWT({
      employeeId: employee._id.toString(),
      orgId: org._id.toString(),
      email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1y")
      .sign(SECRET_KEY)

    const response = NextResponse.json({ error: false, message: "Logged in" })
    response.cookies.set("token", token, { httpOnly: true, secure: true })

    return response
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}