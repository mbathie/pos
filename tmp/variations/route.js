import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getEmployee } from "@/lib/auth"

export async function GET(req, { params }) {
  try {
    const { employee } = await getEmployee()
    const { id } = await params

    const variations = await prisma.variation.findMany({
      where: {
        categoryId: parseInt(id)
      },
    });

    // console.log(variations)
      
    return NextResponse.json({variations}, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

