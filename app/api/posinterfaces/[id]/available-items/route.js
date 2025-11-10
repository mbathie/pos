import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { Product, Folder } from '@/models';

// GET /api/posinterfaces/[id]/available-items - Get all products, folders, and categories for selection
export async function GET(request, { params }) {
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin and manager can access POS interface configuration
    if (!['ADMIN', 'MANAGER'].includes(employee.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Manager access required' }, { status: 403 });
    }

    await connectDB();

    // Get all products (no longer filtered by category - products are organized via POS interfaces)
    const products = await Product.find({
      org: employee.org._id,
      deleted: { $ne: true },
      type: { $in: ['shop', 'class', 'course', 'general', 'membership'] } // Exclude dividers
    }).sort({ name: 1 });

    // Group products by type for better organization in the selector
    const productsByType = {
      shop: products.filter(p => p.type === 'shop'),
      class: products.filter(p => p.type === 'class'),
      course: products.filter(p => p.type === 'course'),
      general: products.filter(p => p.type === 'general'),
      membership: products.filter(p => p.type === 'membership')
    };

    // Create virtual categories based on product types
    const categoriesWithProducts = [
      { _id: 'shop', name: 'Shop Products', products: productsByType.shop },
      { _id: 'class', name: 'Classes', products: productsByType.class },
      { _id: 'course', name: 'Courses', products: productsByType.course },
      { _id: 'general', name: 'General Entry', products: productsByType.general },
      { _id: 'membership', name: 'Memberships', products: productsByType.membership }
    ].filter(cat => cat.products.length > 0); // Only include categories with products

    // Get all folders
    const folders = await Folder.find({ org: employee.org._id })
      .sort({ name: 1 });

    return NextResponse.json({
      categoriesWithProducts,
      folders
    });
  } catch (error) {
    console.error('Error fetching available items:', error);
    return NextResponse.json({ error: 'Failed to fetch available items' }, { status: 500 });
  }
}
