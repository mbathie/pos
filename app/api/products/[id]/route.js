import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Product } from "@/models";
import { uploadBase64Image, deleteImage, getImageUrl } from "@/lib/spaces";

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

  // Handle image upload if new image is provided (supports both 'image' and 'thumbnail' fields)
  const imageField = product.image !== undefined ? 'image' : (product.thumbnail !== undefined ? 'thumbnail' : null);

  if (imageField) {
    const imageData = product[imageField];

    if (imageData && imageData.startsWith('data:')) {
      try {
        // Delete old image from Spaces if it exists
        const oldImage = existingProduct[imageField];
        if (oldImage) {
          try {
            await deleteImage(oldImage);
          } catch (error) {
            console.error('Error deleting old image:', error);
          }
        }

        // Upload new image to Spaces
        const { url, key } = await uploadBase64Image(
          imageData,
          'products',
          id,
          `product-${Date.now()}.jpg`
        );

        // Replace base64 with the Spaces URL
        product[imageField] = url;
      } catch (error) {
        console.error('Error uploading image to Spaces:', error);
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
      }
    } else if (imageData === null || imageData === '') {
      // If image is being removed, delete from Spaces
      const oldImage = existingProduct[imageField];
      if (oldImage) {
        try {
          await deleteImage(oldImage);
        } catch (error) {
          console.error('Error deleting image:', error);
        }
      }
      product[imageField] = null;
    }
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