import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Customer } from "@/models"

export async function POST(req) {
  await connectDB()
  const { employee } = await getEmployee()
  const { name, email, phone } = await req.json()

  if (await Customer.findOne({ email }))
    return NextResponse.json({ error: 'email exists', exists: true }, { status: 400 });

  try {
    const customer = await Customer.create({
      name, email, phone,
      orgs: [employee.orgId],
    })
    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req) {
  await connectDB()
  const { employee } = await getEmployee()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const orgId = employee.orgId

  if (!search)
    return NextResponse.json({ error: "Missing search parameter" }, { status: 400 })

  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape special chars
  const regex = new RegExp(escaped, "i") // case-insensitive
  const customers = await Customer.find({
    orgs: orgId,
    $or: [
      { name: { $regex: regex } },
      { email: { $regex: regex } },
      { phone: { $regex: regex } }
    ]
  })

  console.log(customers)

  return NextResponse.json(customers)
}