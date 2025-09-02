import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Product, Category, Org } from '@/models';
import { getEmployee } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    // Verify authentication
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { id } = await params;

    // Find the product and populate its category to get the organization
    const product = await Product.findById(id)
      .populate({
        path: 'category',
        select: 'org',
        populate: {
          path: 'org',
          select: 'tandcContent'
        }
      })
      .lean();

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const orgTerms = product.category?.org?.tandcContent || null;

    return NextResponse.json({
      tandcContent: orgTerms
    });
  } catch (error) {
    console.error('Error fetching org terms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization terms' },
      { status: 500 }
    );
  }
}