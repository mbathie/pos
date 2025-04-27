import { getEmployee } from "@/lib/auth"
import { NextResponse } from "next/server"
import prisma from "@/lib/db"

export async function POST(req) {
  try {
    const { employee } = await getEmployee()
    console.log(employee)

    const body = await req.json()
    const { products } = body

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: "Products must be an array" }, { status: 400 })
    }

    // First, try to find the Subscriptions category
    let subscriptionCategory = await prisma.category.findFirst({
      where: {
        name: "subscriptions",
        orgId: employee.org.id
      },
      select: { id: true }
    })
    console.log(subscriptionCategory)

    // If it doesn't exist, create it
    if (!subscriptionCategory) {
      subscriptionCategory = await prisma.category.create({
        data: {
          name: "subscriptions",
          orgId: employee.orgId
        },
        select: { id: true }
      })
    }

    const categoryId = subscriptionCategory.id

    console.log(categoryId)

    // Now continue with upserting products
    const upsertedProducts = await Promise.all(
      products.map(async (product) => {
        const upsertedProduct = await prisma.product.upsert({
          where: { id: product.id ?? 0 }, // If product.id doesn't exist, Prisma will create a new one
          create: {
            name: product.name,
            categoryId,
            recurring: true,
            prices: {
              create: product.prices?.map(price => ({
                name: price.name,
                amount: parseFloat(price.amount) || 0
              })) || [],
            },
          },
          update: {
            name: product.name,
            categoryId,
            recurring: true,
            prices: {
              deleteMany: {}, // clear old prices
              create: product.prices?.map(price => ({
                name: price.name,
                amount: parseFloat(price.amount) || 0
              })) || [],
            },
          },
          include: {
            prices: true
          }
        })

        return upsertedProduct
      })
    )

    return NextResponse.json(upsertedProducts, { status: 201 })

  } catch (error) {
    console.error("[PRODUCT SUBSCRIPTIONS POST]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}