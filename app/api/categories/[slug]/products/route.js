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

  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(slug);

  const category = await Category.findOne(
    isValidObjectId ? { _id: slug, org: employee.org._id } : { name: slug, org: employee.org._id }
  );

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const products = await Product.find({ category: category._id })
    .populate('folder')
    .populate({ path: 'accounting', strictPopulate: false })
    .sort({ createdAt: -1 });

  return NextResponse.json({ products }, { status: 200 });
}