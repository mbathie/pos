import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getProducts } from '@/lib/products'

export async function GET(req, { params }) {
  const { id } = await params;
  const categoryId = parseInt(id)

  const products = await getProducts({categoryId})

  return NextResponse.json(products, { status: 200 });
}