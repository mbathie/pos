import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Product, Category, Folder, Accounting } from '@/models';
import { getEmployee } from '@/lib/auth';

export async function GET(request) {
  try {
    await connectDB();
    
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('category');
    const searchQuery = searchParams.get('search');

    // Build the query
    let query = { deleted: { $ne: true } };
    
    // Add category filter
    if (categoryFilter) {
      query.category = categoryFilter;
    }

    // Add search filter
    if (searchQuery) {
      query.name = { $regex: searchQuery, $options: 'i' };
    }

    // Fetch products with populated references
    const products = await Product.find(query)
      .populate('category', 'name thumbnail')
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