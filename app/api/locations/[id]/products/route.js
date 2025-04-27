import { NextResponse } from 'next/server'
import prisma from "@/lib/db"

export async function PUT(req, { params }) {
  try {

    const { id } = await params;
    const locationId = parseInt(id)
    const { products } = await req.json();

    if (!locationId || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const updates = await Promise.all(
      products.map(async ({ productId, enabled }) => {
        await prisma.productLocation.upsert({
          where: {
            locationId_productId: {
              locationId,
              productId,
            },
          },
          update: {
            enabled,
          },
          create: {
            locationId,
            productId,
            enabled,
          },
        });
        
      })
    )

    return NextResponse.json({ success: true, updates })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}