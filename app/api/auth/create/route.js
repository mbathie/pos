import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { connectDB } from "@/lib/mongoose"
import { Org, Location, Employee } from "@/models"
import { 
  getOrCreateBrowserId, 
  updateAuth 
} from "@/lib/cookies"

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

    // Get or generate browser ID for the new org
    const browserId = await getOrCreateBrowserId()

    const org = await Org.create({ name, phone, deleted: false })
    
    // Create the Main HQ location with browser ID already set
    const location = await Location.create({ 
      name: "Main HQ", 
      org, 
      deleted: false, 
      phone,
      browser: browserId // Set browser ID for the default location
    })
    
    console.log('🖥️ New org signup: Main HQ tied to browser:', {
      orgName: name,
      locationId: location._id,
      browserId: browserId
    })
    
    const employee = await Employee.create({
      name: nameEmployee,
      email,
      hash,
      org: org._id,
      role: "ADMIN",
    })

    let selectedLocationId = location._id.toString() // Always use the new location for signup

    // Update auth with location and set all cookies
    await updateAuth({ 
      employee, 
      locationId: selectedLocationId, 
      browserId 
    })

    return NextResponse.json({ error: false, message: "Logged in" })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}