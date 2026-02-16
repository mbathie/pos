import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { PrepaidPack } from '@/models';

export async function GET() {
  await connectDB();
  const result = await getEmployee();
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  const { employee } = result;

  const packs = await PrepaidPack.find({ org: employee.org._id })
    .populate('products', 'name thumbnail')
    .sort({ createdAt: -1 });
  return NextResponse.json({ packs }, { status: 200 });
}

export async function POST(req) {
  await connectDB();
  const result = await getEmployee();
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  const { employee } = result;

  const body = await req.json();
  const { name, description, thumbnail, products = [], prices = [], active = true, waiverRequired = false } = body || {};

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!Array.isArray(prices) || prices.length === 0) {
    return NextResponse.json({ error: 'At least one price is required' }, { status: 400 });
  }

  const pack = await PrepaidPack.create({
    name,
    description,
    thumbnail,
    products,
    prices,
    active,
    waiverRequired,
    org: employee.org._id,
  });

  return NextResponse.json({ pack }, { status: 201 });
}
