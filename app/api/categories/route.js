import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Category, Product } from "@/models";

export async function GET(req) {
  await connectDB();

  const { employee } = await getEmployee();

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

  const categories = await Category.find(query);

  // If includeProducts is requested, fetch products for each category
  if (includeProducts === 'true') {
    const categoriesWithProducts = await Promise.all(
      categories.map(async (category) => {
        const products = await Product.find({ 
          category: category._id,
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