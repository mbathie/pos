import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getEmployee } from "@/lib/auth";
import { getProducts } from '@/lib/products'

export async function DELETE(req, { params }) {
  const { id } = await params;
  const productId = parseInt(id)

  await prisma.product.update({
    where: { id: productId },
    data: { deletedAt: new Date() }
  })

  return NextResponse.json({}, { status: 201 });
}


export async function PUT(req, { params }) {
  try {
    const { employee } = await getEmployee();

    const { id } = await params;
    const body = await req.json();
    const { product } = body;

    if (product.new) {
      console.log(product)
      const newProduct = await prisma.product.create({
        data: {
          data: { thumbnail: product.thumbnail },
          name: product.name,
          categories: {
            connect: [{ id: product.categoryId }],
          },
        }
      })

      const _product = await getProducts({categoryId: product.categoryId, productId: newProduct.id})
      return NextResponse.json({ product: _product }, { status: 201 });

    }    

    console.log(product)

    await prisma.product.update({
      data: { 
        name: product.name, 
        data: { thumbnail: product.data.thumbnail }
      },
      where: { id: parseInt(id) },
    });


    // Handle prices
    for (let i = 0; i < product.prices.length; i++) {
      const pr = product.prices[i];

      // console.log(pr);
      if (pr.delete)
        await prisma.price.update({
          where: { id: pr.id },
          data: { deletedAt: new Date() },
        });

      if (!pr.name || !pr.amount) continue;

      else if (pr.id)
        await prisma.price.update({
          where: { id: pr.id },
          data: {
            amount: parseFloat(pr.amount),
            name: pr.name,
          },
        });
      else {
        await prisma.price.create({
          data: {
            productId: product.id,
            amount: parseFloat(pr.amount),
            name: pr.name,
          },
        });
      }
    }

    for (const v of product.variations) {

      if (v.new) {
        const variation = await prisma.variation.create({
          data: { name: v.name, categoryId: product.categoryId, multi: false }
        })
        continue
      }

      // VARIANTS
      for (const vv of v?.variants) {
        let variantId = vv.id;
      
        if (!variantId) {
          const newVariant = await prisma.variant.create({
            data: {
              name: vv.name,
              amount: vv.amount ? parseFloat(vv.amount) : 0,
              variationId: vv.variationId,
            },
          });
          variantId = newVariant.id;
        }
      
        const _vv = await prisma.productVariant.upsert({
          where: {
            productId_variantId: {
              productId: product.id,
              variantId,
            },
          },
          update: {
            enabled: vv.enabled,
          },
          create: {
            productId: product.id,
            variantId,
            enabled: vv.enabled,
          },
        });
      
        // console.log(_vv);
      }
    }

    const _product = await getProducts({categoryId: product.categoryId, productId: parseInt(id)})
  

    return NextResponse.json({ product: _product }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}