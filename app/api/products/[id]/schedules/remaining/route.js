import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth";
import { Schedule } from "@/models"
import mongoose from "mongoose"

export async function GET(req, { params }) {
  await connectDB();
  const { employee } = await getEmployee();
  const { id } = await params
  const { Product } = await import('@/models');

  // First get the product to check its capacity
  const product = await Product.findOne({
    _id: new mongoose.Types.ObjectId(String(id)),
    org: employee.org._id
  });

  if (!product) {
    return NextResponse.json({ available: 0 }, { status: 404 });
  }

  // For courses, check how many enrollments exist
  const schedule = await Schedule.findOne({
    org: employee.org._id,
    product: new mongoose.Types.ObjectId(String(id))
  });

  // If no schedule exists yet, all spots are available
  if (!schedule) {
    return NextResponse.json({ available: product.capacity || 0 }, { status: 200 });
  }

  // Calculate remaining spots
  const enrolled = schedule.customers?.length || 0;
  const capacity = product.capacity || 0;
  const available = Math.max(0, capacity - enrolled);

  console.log(`Product ${id}: capacity=${capacity}, enrolled=${enrolled}, available=${available}`);

  return NextResponse.json({ available }, { status: 200 });
}
