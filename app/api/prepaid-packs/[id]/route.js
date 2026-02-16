import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { PrepaidPack } from '@/models';

export async function GET(req, { params }) {
  await connectDB();
  const result = await getEmployee();
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  const { id } = await params;
  const pack = await PrepaidPack.findById(id)
    .populate('products', 'name thumbnail');
  if (!pack) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ pack }, { status: 200 });
}

export async function PUT(req, { params }) {
  await connectDB();
  const result = await getEmployee();
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  const { id } = await params;
  const body = await req.json();
  const update = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.description !== undefined) update.description = body.description;
  if (body.thumbnail !== undefined) update.thumbnail = body.thumbnail;
  if (Array.isArray(body.products)) update.products = body.products;
  if (Array.isArray(body.prices)) update.prices = body.prices;
  if (body.active !== undefined) update.active = body.active;
  if (body.waiverRequired !== undefined) update.waiverRequired = body.waiverRequired;

  const pack = await PrepaidPack.findByIdAndUpdate(id, update, { new: true })
    .populate('products', 'name thumbnail');
  if (!pack) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ pack }, { status: 200 });
}

export async function DELETE(req, { params }) {
  await connectDB();
  const result = await getEmployee();
  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  const { id } = await params;
  await PrepaidPack.findByIdAndDelete(id);
  return NextResponse.json({ ok: true }, { status: 200 });
}
