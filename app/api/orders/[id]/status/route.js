import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { Order } from "@/models"

export async function POST(req, { params }) {
  await connectDB()

  const { id } = await params
  const { status } = await req.json()

  const order = await Order.findByIdAndUpdate(id, { status }, { new: true })
    .populate('location')
    .populate('customer')
    .populate('transaction')
    .populate('products.product');

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order, { status: 200 });
}
