import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Category, Product } from "@/models";

export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const org = employee.org;

  const { product } = await req.json();
  const { slug } = await params;
  
  console.log('Received product:', product);

  // Check if product is undefined or null
  if (!product) {
    return NextResponse.json({ error: 'Product data is required' }, { status: 400 });
  }

  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(slug);

  const category = await Category.findOneAndUpdate(
    isValidObjectId ? { _id: slug, org: employee.org._id } : { name: slug, menu: slug, org: employee.org._id },
    {},
    { new: true, upsert: !isValidObjectId }
  );

  let _product;

  if (product._id) {
    _product = await Product.findOneAndUpdate(
      { _id: product._id },
      { ...product, category: category._id, folder: product.folder?._id || null },
      { new: true, upsert: true }
    );
  } else {
    _product = await Product.create({
      ...product,
      category: category._id,
      folder: product.folder?._id || null,
    });
  }

  const populatedProduct = await Product.findById(_product._id)
    .populate('folder')
    .populate({ path: 'accounting', strictPopulate: false });
  return NextResponse.json({ product: populatedProduct }, { status: 201 });
}

export async function GET(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const org = employee.org;
  const { slug } = await params;
  
  // Get query parameters
  const { searchParams } = new URL(req.url);
  const publishedFilter = searchParams.get('published');

  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(slug);

  const category = await Category.findOne(
    isValidObjectId ? { _id: slug, org: employee.org._id } : { name: slug, org: employee.org._id }
  );

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  // Build query filter
  const filter = { 
    category: category._id,
    deleted: { $ne: true }
  };
  
  // Add publish filter if requested (for POS/retail views)
  if (publishedFilter === '1' || publishedFilter === 'true') {
    filter.publish = { $ne: false }; // Include products where publish is true or undefined
  }

  const products = await Product.find(filter)
    .populate('folder')
    .populate({ path: 'accounting', strictPopulate: false })
    .sort({ order: 1, createdAt: -1 });  // Sort by order field first, then by creation date

  return NextResponse.json({ products }, { status: 200 });
}