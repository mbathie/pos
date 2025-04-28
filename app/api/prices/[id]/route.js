import { NextResponse } from "next/server";
import prisma from "@/lib/db"; // Adjust based on your setup

export async function DELETE(req, { params }) {
  const { id } = await params; // Use params to extract the dynamic id

  try {
    // Find the price to delete by its ID
    const price = await prisma.price.findUnique({
      where: { id: Number(id) },
    });

    if (!price) {
      return NextResponse.json(
        { message: "Price not found" },
        { status: 404 }
      );
    }

    // Delete the price
    await prisma.price.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Price deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
