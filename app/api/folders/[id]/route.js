import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { Folder, Product } from "@/models";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const folder = await Folder.findOne({ _id: id, org: employee.org._id });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found or unauthorized' }, { status: 404 });
    }

    // Populate items in contains array
    const { Product: ProductModel, ProductGroup } = await import('@/models');
    const populatedItems = [];

    if (folder.contains && folder.contains.length > 0) {
      // Sort by order
      const sortedContains = [...folder.contains].sort((a, b) => (a.order || 0) - (b.order || 0));

      for (const item of sortedContains) {
        if (item.itemType === 'product') {
          const product = await ProductModel.findById(item.itemId);
          if (product) {
            populatedItems.push({
              itemType: 'product',
              order: item.order,
              data: product.toObject()
            });
          }
        } else if (item.itemType === 'group') {
          const group = await ProductGroup.findById(item.itemId)
            .populate('products')
            .populate('variations.products');
          if (group) {
            populatedItems.push({
              itemType: 'group',
              order: item.order,
              data: group.toObject()
            });
          }
        }
      }
    }

    return NextResponse.json({
      folder: {
        ...folder.toObject(),
        items: populatedItems
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/folders/[id]:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const { name, color, category, order, groups, contains } = await req.json();
  const { id } = await params;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (color !== undefined) updateData.color = color;
  if (category !== undefined) updateData.category = category;
  if (order !== undefined) updateData.order = order;
  if (Array.isArray(groups)) updateData.groups = groups; // Legacy support
  if (Array.isArray(contains)) updateData.contains = contains;

  const folder = await Folder.findOneAndUpdate(
    { _id: id, org: employee.org._id },
    updateData,
    { new: true }
  );

  if (!folder) {
    return NextResponse.json({ error: 'Folder not found or unauthorized' }, { status: 404 });
  }

  return NextResponse.json({ folder }, { status: 200 });
}

export async function DELETE(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const { id } = await params;

  const folder = await Folder.findOneAndDelete(
    { _id: id, org: employee.org._id }
  );

  if (!folder) {
    return NextResponse.json({ error: 'Folder not found or unauthorized' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Folder deleted successfully' }, { status: 200 });
}