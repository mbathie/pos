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
    const upcoming = searchParams.get('upcoming') === 'true';

    const now = new Date();
    const query = {
      location: employee.selectedLocationId,
    };

    if (upcoming) {
      // Show upcoming orders (scheduled for the future)
      query.notBefore = { $gt: now };
    } else {
      // Show current orders: within time range AND (no notBefore OR notBefore has passed)
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      query.createdAt = { $gte: since };
      query.$or = [
        { notBefore: null },
        { notBefore: { $exists: false } },
        { notBefore: { $lte: now } }
      ];
    }

    const orders = await Order.find(query)
      .populate('location')
      .populate('customer')
      .populate({
        path: 'transaction',
        populate: { path: 'company' }
      })
      .populate('products.product')
      .sort(upcoming ? { notBefore: 1 } : { createdAt: -1 })
      .lean();

    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}