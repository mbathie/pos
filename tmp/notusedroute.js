import { NextResponse } from "next/server"
import prisma from "@/lib/db"
import { getEmployee } from "@/lib/auth";

export async function POST(req) {
  try {
    const { employee } = await getEmployee()
    const body = await req.json();
    const { name, categoryId } = body;

    if (!name || !categoryId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Ensure the category exists and belongs to the employee's org
    const category = await prisma.category.findUnique({
      where: { id: categoryId, orgId: employee.orgId },
    });

    if (!category) {
      return NextResponse.json({ error: "Invalid category or unauthorized" }, { status: 403 });
    }

    // Create the new product
    const product = await prisma.product.create({
      data: {
        name,
        categories: {
          connect: [{ id: categoryId }],
        },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
