import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { Product } from "@/models";

export async function GET() {
  try {
    await connectDB();

    // Find products where qty <= par and qty > 0 (low stock but not out of stock)
    const lowStockCount = await Product.countDocuments({
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