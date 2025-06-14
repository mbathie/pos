import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Location } from "@/models"

export async function GET() {
  await connectDB()
  const { employee, error, status } = await getEmployee()

  if (error)
    return NextResponse.json({ error }, { status })

  const locations = await Location.find(
    { orgId: employee.org._id },
    // { _id: 1, name: 1 }
  ).lean()

  return NextResponse.json(locations, { status: 200 })
}

export async function POST(req) {
  await connectDB()
  const { employee, error, status } = await getEmployee()

  if (error)
    return NextResponse.json({ error }, { status })

  const data = await req.json()
  const { name, phone, address1, city, state, postcode, storeHours } = data

  if (!name || !address1)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const location = await Location.create({
    orgId: employee.org._id,
    name, phone,
    address1, city, state, postcode,
    storeHours,
  })

  return NextResponse.json(location, { status: 201 })
}