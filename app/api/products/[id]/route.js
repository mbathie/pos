import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Product } from "@/models";

export async function GET(req, { params }) {
  await connectDB();
  
  const { employee } = await getEmployee();
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { id } = await params;
  
  const product = await Product.findById(id)
    .populate({ path: 'accounting', strictPopulate: false })
    .populate('category')
    .populate('folder');
    
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  
  // Verify the product's category belongs to the employee's org
  if (!product.category || product.category.org?.toString() !== employee.org._id.toString()) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  
  return NextResponse.json({ product }, { status: 200 });
}

export async function PUT(req, { params }) {
  await connectDB();
  
  const { employee } = await getEmployee();
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { product } = await req.json();
  const { id } = await params
  console.log('PUT product received:', product)

  // First verify the product exists and belongs to a category in this org
  const existingProduct = await Product.findById(id).populate('category');
  if (!existingProduct || !existingProduct.category || 
      existingProduct.category.org?.toString() !== employee.org._id.toString()) {
    return NextResponse.json({ error: "Product not found or unauthorized" }, { status: 404 });
  }

  const updatedProduct = await Product.findOneAndUpdate(
    { _id: id },
    product,
    { new: true }
  )
    .populate('accounting')
    .populate('category')
    .populate('folder');

  return NextResponse.json({ product: updatedProduct }, { status: 201 });
}

export async function DELETE(req, { params }) {
  await connectDB();
  
  const { employee } = await getEmployee();
  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const product = await Product.findById(id).populate('category');

  if (!product || !product.category || 
      product.category.org?.toString() !== employee.org._id.toString()) {
    return NextResponse.json({ error: "Product not found or unauthorized" }, { status: 404 });
  }

  await product.delete();

  return NextResponse.json({ message: "Product deleted successfully" }, { status: 200 });
}