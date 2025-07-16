import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Product } from "@/models";

export async function GET(req, { params }) {
  await connectDB();
  
  const { id } = await params;
  
  const product = await Product.findById(id)
    .populate({ path: 'accounting', strictPopulate: false })
    .populate('category')
    .populate('folder');
    
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  
  return NextResponse.json({ product }, { status: 200 });
}

export async function PUT(req, { params }) {
  await connectDB();

  const { product } = await req.json();
  const { id } = await params
  console.log(id)

  const updatedProduct = await Product.findOneAndUpdate(
    { _id: id },
    product,
    { new: true }
  )
    .populate('accounting');

  return NextResponse.json({ product: updatedProduct }, { status: 201 });
}

export async function DELETE(req, { params }) {
  await connectDB();
  const { employee } = await getEmployee();
  const org = employee.org;

  const { id } = await params;

  const product = await Product.findById(id).populate({
    path: 'category',
    strictPopulate: false,
    populate: {
      path: 'org',
      strictPopulate: false
    }
  });

  console.log(product.category?.org?._id?.toString())
  console.log(org._id.toString())

  if (!product || product.category?.org?._id?.toString() !== org._id.toString()) {
    return NextResponse.json({ error: "Unauthorized or not found" }, { status: 403 });
  }

  await product.delete();

  return NextResponse.json({ message: "Product deleted successfully" }, { status: 200 });
}