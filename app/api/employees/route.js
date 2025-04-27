import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getEmployee } from "@/lib/auth";
import bcrypt from "bcrypt"
import { generateRandomPassword } from '@/lib/utils'

export async function GET() {
  const { employee, error, status } = await getEmployee()

  if (error)
    return NextResponse.json({ error }, { status })

  const employees = await prisma.employee.findMany({
    where: { orgId: employee.org.id },
    omit: { hash: true },
    include: { location: true }
  })

  return NextResponse.json(employees, { status: 200 });
}

export async function POST(req) {
  try {
    const { employee } = await getEmployee()
    const body = await req.json()
    const { name, email, locationId, role } = body

    const password = generateRandomPassword()
    const hash = await bcrypt.hash(password, 10)

    if (!name || !email || !locationId)
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })

    const newEmployee = await prisma.employee.create({
      data: { name, email, orgId: employee.orgId, locationId, hash, role },
      omit: { hash: true },
      include: { location: true }
    })

    return NextResponse.json({...newEmployee, password}, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
