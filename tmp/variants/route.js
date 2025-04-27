import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getEmployee } from "@/lib/auth"

export async function GET(req, { params }) {
  try {
    const { employee } = await getEmployee()
    const { id } = await params

    const variants = await prisma.variant.findMany({
      where: {
        categoryId: parseInt(id)
      },
    });

    // console.log(variants)
      
    return NextResponse.json({variants}, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

