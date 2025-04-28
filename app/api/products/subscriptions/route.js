import { getEmployee } from "@/lib/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function POST(req, { params }) {
  const { employee } = await getEmployee()
  const body = await req.json()
  const { product } = body

  let subscriptionCategory = await prisma.category.findFirst({
    where: { name: "Subscriptions", orgId: employee.org.id },
    select: { id: true }
  })
  if (!subscriptionCategory) {
    subscriptionCategory = await prisma.category.create({
      data: { name: "Subscriptions", orgId: employee.org.id, recurring: true },
      select: { id: true },
    })
  }
  const categoryId = subscriptionCategory.id

  const createdProduct = await prisma.product.create({
    data: { name: product.name, categoryId,
    },
    include: {
      prices: true,
    },
  })

  return NextResponse.json({ product: createdProduct }, { status: 201 });
}

export async function GET(req, { params }) {
  try {
    const { employee } = await getEmployee()

    if (!employee?.orgId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const recurringProducts = await prisma.product.findMany({
      where: {
        deletedAt: null,
        category: {
          orgId: employee.org.id,
          recurring: true
        }
      },
      include: {
        prices: true
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json(recurringProducts, { status: 200 })
    
  } catch (error) {
    console.error("[RECURRING PRODUCTS GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}