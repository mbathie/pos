import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Product, Category } from "@/models";
import { getEmployee } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();
    
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all categories for this org
    const orgCategories = await Category.find({ 
      org: employee.org._id 
    }).select('_id');
    
    const categoryIds = orgCategories.map(cat => cat._id);

    // Find products where qty <= par and qty > 0 (low stock but not out of stock)
    // and belong to categories in this org
    const lowStockCount = await Product.countDocuments({
      category: { $in: categoryIds },
      qty: { $exists: true, $ne: null, $gt: 0 },
      par: { $exists: true, $ne: null },
      $expr: { $lte: ["$qty", "$par"] }
    });

    return NextResponse.json({ 
      count: lowStockCount 
    });

  } catch (error) {
    console.error("Error fetching low stock count:", error);
    return NextResponse.json(
      { error: "Failed to fetch low stock count" },
      { status: 500 }
    );
  }
} 