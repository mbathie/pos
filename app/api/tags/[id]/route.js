import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Tag, Product } from "@/models";

export async function GET(req, { params }) {
  await connectDB();

  const result = await getEmployee();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { employee } = result;
  const { id } = await params;

  const tag = await Tag.findOne({ _id: id, org: employee.org._id });

  if (!tag) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  return NextResponse.json({ tag }, { status: 200 });
}

export async function PUT(req, { params }) {
  await connectDB();

  const result = await getEmployee();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { employee } = result;
  const { id } = await params;
  const body = await req.json();

  try {
    const tag = await Tag.findOne({ _id: id, org: employee.org._id });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const { name, color, order } = body;

    if (name !== undefined) {
      // Check if another tag with same name exists
      const existingTag = await Tag.findOne({
        org: employee.org._id,
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });

      if (existingTag) {
        return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 400 });
      }

      tag.name = name.trim();
    }

    if (color !== undefined) {
      tag.color = color;
    }

    if (order !== undefined) {
      tag.order = order;
    }

    await tag.save();

    return NextResponse.json({ tag }, { status: 200 });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await connectDB();

  const result = await getEmployee();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { employee } = result;
  const { id } = await params;

  try {
    const tag = await Tag.findOne({ _id: id, org: employee.org._id });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Remove this tag from all products that have it
    await Product.updateMany(
      { org: employee.org._id, tags: id },
      { $pull: { tags: id } }
    );

    await Tag.deleteOne({ _id: id });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
