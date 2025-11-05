import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { Product, Folder, Category } from '@/models';

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

    // Get all categories with their products
    const categories = await Category.find({ org: employee.org._id, deleted: false })
      .sort({ name: 1 });

    // Get all products grouped by category
    const categoriesWithProducts = await Promise.all(
      categories.map(async (category) => {
        const products = await Product.find({
          category: category._id,
          type: { $in: ['shop', 'class', 'course', 'general', 'membership'] } // Exclude dividers
        }).sort({ name: 1 });

        return {
          _id: category._id,
          name: category.name,
          products
        };
      })
    );

    // Get all folders
    const folders = await Folder.find({ org: employee.org._id })
      .populate('category', 'name')
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
