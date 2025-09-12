import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Product, Category } from '@/models';
import { getEmployee } from '@/lib/auth';

export async function GET(request) {
  try {
    await connectDB();
    
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const menu = searchParams.get('menu'); // 'shop', 'general', 'classes', 'memberships'

    // Get all categories for this org, optionally filtered by menu
    const categoryQuery = { org: employee.org._id };
    if (menu) {
      categoryQuery.menu = menu;
    }
    
    const categories = await Category.find(categoryQuery)
      .select('_id name menu')
      .lean();
    
    // Get product counts for each category
    const categorySummary = await Promise.all(
      categories.map(async (category) => {
        const count = await Product.countDocuments({
          category: category._id,
          deleted: { $ne: true }
        });
        
        return {
          categoryId: category._id,
          categoryName: category.name,
          menu: category.menu,
          productCount: count
        };
      })
    );
    
    // Create a summary object with menu totals
    const menuSummary = {};
    categorySummary.forEach(cat => {
      if (!menuSummary[cat.menu]) {
        menuSummary[cat.menu] = {
          totalProducts: 0,
          categories: []
        };
      }
      menuSummary[cat.menu].totalProducts += cat.productCount;
      menuSummary[cat.menu].categories.push({
        id: cat.categoryId,
        name: cat.categoryName,
        count: cat.productCount
      });
    });

    return NextResponse.json({ 
      summary: menuSummary,
      categories: categorySummary
    });

  } catch (error) {
    console.error('Error fetching products summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products summary' },
      { status: 500 }
    );
  }
}