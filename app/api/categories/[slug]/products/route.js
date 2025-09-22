import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Category, Product } from "@/models";
import { uploadBase64Image, deleteImage } from "@/lib/spaces";

export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const org = employee.org;

  const { product } = await req.json();
  const { slug } = await params;

  console.log('Received product, thumbnail:', product.thumbnail ? product.thumbnail.substring(0, 50) + '...' : 'no thumbnail');

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

  // Handle image upload if new image is provided (supports both 'image' and 'thumbnail' fields)
  const imageField = product.image !== undefined ? 'image' : (product.thumbnail !== undefined ? 'thumbnail' : null);

  if (imageField) {
    const imageData = product[imageField];
    console.log(`Processing ${imageField}, starts with:`, imageData ? imageData.substring(0, 30) : 'null');

    // Only process base64 JPEG/PNG images, not SVG icons
    if (imageData && (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/png'))) {
      try {
        // If product has an existing ID, check for old image to delete
        if (product._id) {
          const existingProduct = await Product.findById(product._id);
          if (existingProduct && existingProduct[imageField]) {
            try {
              await deleteImage(existingProduct[imageField]);
            } catch (error) {
              console.error('Error deleting old image:', error);
            }
          }
        }

        // Upload new image to Spaces
        const productId = product._id || new Date().getTime(); // Use timestamp if no ID yet
        const { url, key } = await uploadBase64Image(
          imageData,
          'products',
          productId,
          `product-${Date.now()}.jpg`
        );

        // Replace base64 with the Spaces URL
        product[imageField] = url;
        console.log('Uploaded to Spaces, new URL:', url);
      } catch (error) {
        console.error('Error uploading image to Spaces:', error);
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
      }
    }
  }

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