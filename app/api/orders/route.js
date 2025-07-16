import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Order } from '@/models';

export async function GET(req) {
  try {
    await connectDB();
    const { employee } = await getEmployee();
    
    const { searchParams } = new URL(req.url);
    const hours = Number(searchParams.get('hours') || '24');

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const orders = await Order.find({
      createdAt: { $gte: since },
      location: employee.selectedLocationId,
    })
      .populate('location')
      .populate('customer')
      .populate('transaction')
      .populate('products.product')
      .lean();

    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}