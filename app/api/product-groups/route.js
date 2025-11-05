import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { ProductGroup } from '@/models';

export async function GET() {
  await connectDB();
  const result = await getEmployee();
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  const { employee } = result;

  const groups = await ProductGroup.find({ org: employee.org._id }).populate('products', 'name thumbnail').sort({ createdAt: -1 });
  return NextResponse.json({ groups }, { status: 200 });
}

export async function POST(req) {
  await connectDB();
  const result = await getEmployee();
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  const { employee } = result;

  const body = await req.json();
  const { name, description, thumbnail, products = [], amount, active = true } = body || {};
  if (!name || typeof amount !== 'number') {
    return NextResponse.json({ error: 'Name and amount are required' }, { status: 400 });
  }

  const group = await ProductGroup.create({
    name,
    description,
    thumbnail,
    products,
    amount,
    active,
    org: employee.org._id,
  });

  return NextResponse.json({ group }, { status: 201 });
}

