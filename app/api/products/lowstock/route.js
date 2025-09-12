import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Product } from "@/models";
import { getEmployee } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();
    
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find products where qty <= par and qty > 0 (low stock but not out of stock)
    const lowStockCount = await Product.countDocuments({
      org: employee.org._id,
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