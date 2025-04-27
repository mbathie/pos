import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getEmployee } from "@/lib/auth"

export async function GET(req) {
  try {
    const { employee } = await getEmployee()

    const categories = await prisma.category.findMany({
      where: { orgId: employee.orgId },
    })
      
    return NextResponse.json({categories}, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const { employee } = await getEmployee()
    const body = await req.json()
    const { name } = body

    const category = await prisma.category.create({
      data: {
        name,
        orgId: employee.orgId
      },
    })
      
    return NextResponse.json({category}, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
