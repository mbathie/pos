import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Product, Category, Folder, Accounting } from '@/models';
import { getEmployee } from '@/lib/auth';
import { uploadBase64Image } from '@/lib/spaces';

export async function GET(request) {
  try {
    await connectDB();

    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const typeFilter = searchParams.get('type');

    // Build the query - filter by org
    let query = {
      org: employee.org._id,
      deleted: { $ne: true }
    };

    // Add search filter
    if (searchQuery) {
      query.name = { $regex: searchQuery, $options: 'i' };
    }

    // Add type filter if provided
    if (typeFilter) {
      query.type = typeFilter;
    }

    // Fetch products with populated references
    const products = await Product.find(query)
      .populate('folder', 'name color')
      .populate('accounting', 'name code')
      .sort({ order: 1, name: 1 }) // Sort by order first, then by name
      .lean();

    return NextResponse.json({
      products,
      total: products.length
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();

    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { product } = await request.json();

    if (!product) {
      return NextResponse.json({ error: 'Product data is required' }, { status: 400 });
    }

    // Ensure org field is always set for new products
    product.org = employee.org._id;

    // Handle image upload if new image is provided (supports both 'image' and 'thumbnail' fields)
    const imageField = product.image !== undefined ? 'image' : (product.thumbnail !== undefined ? 'thumbnail' : null);

    if (imageField) {
      const imageData = product[imageField];
      console.log(`Processing ${imageField}, starts with:`, imageData ? imageData.substring(0, 30) : 'null');

      // Only process base64 JPEG/PNG images, not SVG icons
      if (imageData && (imageData.startsWith('data:image/jpeg') || imageData.startsWith('data:image/png'))) {
        try {
          // Upload new image to Spaces
          const productId = new Date().getTime(); // Use timestamp for new products
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

    // Create the new product
    const newProduct = await Product.create({
      ...product,
      folder: product.folder?._id || product.folder || null,
    });

    // Populate the product before returning
    const populatedProduct = await Product.findById(newProduct._id)
      .populate('folder')
      .populate({ path: 'accounting', strictPopulate: false });

    return NextResponse.json({ product: populatedProduct }, { status: 201 });

  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
} 