import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { PrepaidPass, Checkin } from '@/models';

export async function POST(request) {
  try {
    await connectDB();
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { passCode, productIds } = await request.json();

    if (!passCode || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'Pass code and product IDs are required' }, { status: 400 });
    }

    const pass = await PrepaidPass.findOne({
      code: passCode,
      org: employee.org._id
    });

    if (!pass) {
      return NextResponse.json({ error: 'Prepaid pass not found' }, { status: 404 });
    }

    if (pass.status === 'depleted' || pass.remainingPasses <= 0) {
      return NextResponse.json({ error: 'This prepaid pass has been fully used' }, { status: 400 });
    }

    if (productIds.length > pass.remainingPasses) {
      return NextResponse.json({
        error: `Not enough passes remaining. Have ${pass.remainingPasses}, need ${productIds.length}`
      }, { status: 400 });
    }

    // Match selected products against pass products
    const selectedProducts = pass.products.filter(p =>
      productIds.includes(p._id.toString())
    );

    if (selectedProducts.length !== productIds.length) {
      return NextResponse.json({ error: 'Invalid product selection' }, { status: 400 });
    }

    // Deduct passes
    pass.remainingPasses -= productIds.length;

    // Add redemption record
    pass.redemptions.push({
      date: new Date(),
      products: selectedProducts.map(p => ({ _id: p._id, name: p.name })),
      count: productIds.length
    });

    // Update status if depleted
    if (pass.remainingPasses <= 0) {
      pass.status = 'depleted';
    }

    await pass.save();

    // Create check-in records for each redeemed product
    for (const product of selectedProducts) {
      await Checkin.create({
        customer: pass.customer,
        product: product._id,
        org: employee.org._id,
        status: 'checked-in',
        method: 'qr-code',
        success: { status: true, reason: 'success' }
      });
    }

    console.log(`Redeemed ${productIds.length} passes from prepaid pass ${passCode}. Remaining: ${pass.remainingPasses}`);

    return NextResponse.json({
      success: true,
      status: pass.status === 'depleted' ? 'prepaid-depleted' : 'prepaid-redeemed',
      message: `Successfully redeemed ${productIds.length} pass${productIds.length > 1 ? 'es' : ''}`,
      remainingPasses: pass.remainingPasses,
      totalPasses: pass.totalPasses,
      redeemedProducts: selectedProducts
    });
  } catch (error) {
    console.error('Prepaid redemption error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
