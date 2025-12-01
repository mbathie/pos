import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Category, Product } from "@/models";

export async function GET(req) {
  await connectDB();

  const result = await getEmployee();
  
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  
  const { employee } = result;

  const { searchParams } = new URL(req.url);
  const menu = searchParams.get("menu");
  const includeProducts = searchParams.get("includeProducts");

  const query = { 
    org: employee.org._id,
    deleted: { $ne: true } // Filter out deleted categories
  };
  if (menu) {
    query.menu = menu;
  }

  const categories = await Category.find(query).sort({ order: 1, createdAt: 1 });

  // If includeProducts is requested, fetch products for each category
  if (includeProducts === 'true') {
    const categoriesWithProducts = await Promise.all(
      categories.map(async (category) => {
        // Query for both ObjectId and string category formats
        const products = await Product.find({
          $or: [
            { category: category._id },
            { category: category._id.toString() }
          ],
          deleted: { $ne: true }
        })
          .populate('folder')
          .populate('accounting')
          .lean();

        return {
          ...category.toObject(),
          products
        };
      })
    );

    return NextResponse.json({ categories: categoriesWithProducts }, { status: 200 });
  }

  return NextResponse.json({ categories }, { status: 200 });
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
    const { name, thumbnail, menu } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Get the highest order number for this menu
    const highestOrderCategory = await Category.findOne({
      org: employee.org._id,
      menu: menu || 'shop',
      deleted: { $ne: true }
    }).sort({ order: -1 });

    const order = highestOrderCategory ? highestOrderCategory.order + 1 : 0;

    const category = await Category.create({
      name,
      slug,
      thumbnail,
      menu: menu || 'shop',
      org: employee.org._id,
      order
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}