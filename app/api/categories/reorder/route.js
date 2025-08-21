import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Category } from '@/models';

export async function PUT(request) {
  try {
    await connectDB();
    
    // Verify authentication
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categories } = await request.json();

    if (!categories || !Array.isArray(categories)) {
      return NextResponse.json({ error: 'Invalid categories data' }, { status: 400 });
    }

    // Update each category's order in the database
    const updatePromises = categories.map(cat => 
      Category.findByIdAndUpdate(
        cat._id,
        { order: cat.order },
        { new: true }
      )
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, message: 'Categories reordered successfully' });
  } catch (error) {
    console.error('Error reordering categories:', error);
    return NextResponse.json({ error: 'Failed to reorder categories' }, { status: 500 });
  }
}