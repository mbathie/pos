import { NextResponse } from "next/server"
import { SignJWT } from "jose"
import prisma from "@/lib/db"
import bcrypt from "bcrypt"

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET)

export async function POST(req) {
  try {
    const { email, password, name, nameEmployee, phone } = await req.json();

    var org = await prisma.org.findFirst({ where: { name } })

    if (org)
      return NextResponse.json({ error: "Already exists" }, { status: 401 })

    const hash = await bcrypt.hash(password, 10)

    var org = await prisma.org.create({
      data: { name, phone },
    });

    var location = await prisma.location.create({
      data: { name: "Main HQ", orgId: org.id },
    });

    var employee = await prisma.employee.create({
      data: {
        name: nameEmployee, email, hash, orgId: org.id, locationId: location.id, role: 'ADMIN'
      },
    })

    // ✅ Generate JWT using `jose`
    const token = await new SignJWT({ employeeId: employee.id, orgId: org.id, email })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1y")
      .sign(SECRET_KEY)

    // ✅ Set HTTP-only cookie
    const response = NextResponse.json({ error: false, message: "Logged in" })
    response.cookies.set("token", token, { httpOnly: true, secure: true })

    return response
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}