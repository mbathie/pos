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
    .populate('folder');
    
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  
  // Verify the product belongs to the employee's org
  if (!product.org || product.org.toString() !== employee.org._id.toString()) {
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
  console.log('PUT product received, thumbnail:', product.thumbnail ? product.thumbnail.substring(0, 50) + '...' : 'no thumbnail')

  // First verify the product exists
  const existingProduct = await Product.findById(id);
  if (!existingProduct) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Verify the product belongs to this org
  if (!existingProduct.org || existingProduct.org.toString() !== employee.org._id.toString()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Handle image upload if new image is provided (supports both 'image' and 'thumbnail' fields)
  const imageField = product.image !== undefined ? 'image' : (product.thumbnail !== undefined ? 'thumbnail' : null);

  if (imageField) {
    const imageData = product[imageField];
    console.log(`Processing ${imageField}, starts with:`, imageData ? imageData.substring(0, 30) : 'null');

    // Only process base64 JPEG/PNG images, not SVG icons
    if (imageData && (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/png'))) {
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
        console.log('Uploaded to Spaces, new URL:', url);
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

  const product = await Product.findById(id);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Verify the product belongs to this org
  if (!product.org || product.org.toString() !== employee.org._id.toString()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await product.delete();

  return NextResponse.json({ message: "Product deleted successfully" }, { status: 200 });
}