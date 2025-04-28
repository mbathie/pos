import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getEmployee } from "@/lib/auth";

export async function PUT(req, { params }) {
  const { employee } = await getEmployee();
  const body = await req.json();
  const { product } = body;

  const updatedProduct = await prisma.product.update({
    where: { id: product.id },
    data: {
      name: product.name,
      prices: {
        deleteMany: {
          id: {
            notIn: product.prices?.filter(p => p.id).map(p => p.id) || [],
          },
        },
        upsert: product.prices?.map(price => ({
          where: { id: price.id || 0 },
          create: {
            name: price.name,
            amount: parseFloat(price.amount) || 0,
          },
          update: {
            name: price.name,
            amount: parseFloat(price.amount) || 0,
          },
        })) || [],
      },
    },
    include: {
      prices: true,
    },
  });

  return NextResponse.json({ product: updatedProduct }, { status: 200 });
}

export async function POST(req, { params }) {
  const { employee } = await getEmployee();
  const body = await req.json();
  const { product } = body;

  if (!product)
    return NextResponse.json({ error: "Missing product" }, { status: 400 })

  let subscriptionCategory = await prisma.category.findFirst({
    where: {
      name: "Subscriptions",
      orgId: employee.orgId,
    },
    select: { id: true },
  })
  if (!subscriptionCategory) {
    subscriptionCategory = await prisma.category.create({
      data: {
        name: "subscriptions",
        orgId: employee.orgId,
        recurring: true,
      },
      select: { id: true },
    })
  }
  const categoryId = subscriptionCategory.id;

  const upsertedProduct = await prisma.product.upsert({
    where: { id: product.id ?? 0 },
    create: {
      name: product.name,
      categoryId,
      prices: {
        create: product.prices?.map(price => ({
          name: price.name,
          amount: parseFloat(price.amount) || 0,
        })) || [],
      },
    },
    update: {
      name: product.name,
      categoryId,
      prices: {
        deleteMany: {
          id: {
            notIn: product.prices?.filter(p => p.id).map(p => p.id) || [],
          },
        },
        upsert: product.prices?.map(price => ({
          where: { id: price.id || 0 }, // If id = 0, Prisma will create
          create: {
            name: price.name,
            amount: parseFloat(price.amount) || 0,
          },
          update: {
            name: price.name,
            amount: parseFloat(price.amount) || 0,
          },
        })) || [],
      },
    },
    include: {
      prices: true,
    },
  });

  return NextResponse.json({ product: upsertedProduct }, { status: 201 });

}