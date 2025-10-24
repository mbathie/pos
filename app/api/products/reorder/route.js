import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Product } from '@/models';

export async function PUT(request) {
  try {
    await connectDB();
    const { employee } = await getEmployee();

    const { productIds, categoryId } = await request.json();

    if (!productIds || !Array.isArray(productIds)) {
      return Response.json({ error: 'Invalid product IDs' }, { status: 400 });
    }

    // Update the order field for each product
    const updatePromises = productIds.map((productId, index) =>
      Product.findByIdAndUpdate(productId, { order: index })
    );

    await Promise.all(updatePromises);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error reordering products:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
