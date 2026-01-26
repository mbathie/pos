import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Tag } from "@/models";

export async function GET(req) {
  await connectDB();

  const result = await getEmployee();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { employee } = result;

  const tags = await Tag.find({ org: employee.org._id }).sort({ order: 1, name: 1 });

  return NextResponse.json({ tags }, { status: 200 });
}

export async function POST(req) {
  await connectDB();

  const result = await getEmployee();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { employee } = result;
  const body = await req.json();

  try {
    const { name, color } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if tag with same name already exists for this org
    const existingTag = await Tag.findOne({
      org: employee.org._id,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingTag) {
      return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 400 });
    }

    // Get the highest order number
    const highestOrderTag = await Tag.findOne({
      org: employee.org._id
    }).sort({ order: -1 });

    const order = highestOrderTag ? highestOrderTag.order + 1 : 0;

    const tag = await Tag.create({
      name: name.trim(),
      color,
      org: employee.org._id,
      order
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
