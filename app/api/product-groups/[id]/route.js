import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { ProductGroup } from '@/models';

export async function GET(req, { params }) {
  await connectDB();
  const result = await getEmployee();
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  const { id } = params;
  const group = await ProductGroup.findById(id).populate('products', 'name thumbnail');
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ group }, { status: 200 });
}

export async function PUT(req, { params }) {
  await connectDB();
  const result = await getEmployee();
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  const { id } = params;
  const body = await req.json();
  const update = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.description !== undefined) update.description = body.description;
  if (Array.isArray(body.products)) update.products = body.products;
  if (body.amount !== undefined) update.amount = body.amount;
  if (body.active !== undefined) update.active = body.active;

  const group = await ProductGroup.findByIdAndUpdate(id, update, { new: true });
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ group }, { status: 200 });
}

export async function DELETE(req, { params }) {
  await connectDB();
  const result = await getEmployee();
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  const { id } = params;
  await ProductGroup.findByIdAndDelete(id);
  return NextResponse.json({ ok: true }, { status: 200 });
}

