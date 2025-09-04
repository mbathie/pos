import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Discount } from '@/models';

export async function GET(request, { params }) {
  await connectDB();
  
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const discount = await Discount.findOne({
      _id: id,
      org: employee.org._id
    }).lean();

    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    console.log('Retrieved discount for editing:', discount);
    console.log('Discount products field:', discount.products);
    console.log('Discount categories field:', discount.categories);
    return NextResponse.json(discount);

  } catch (error) {
    console.error('Error fetching discount:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discount' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  await connectDB();
  
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      mode,
      code,
      type,
      value,
      maxAmount,
      bogo,
      start,
      expiry,
      archivedAt,
      limits,
      products,
      categories,
    } = body;

    console.log('Updating discount with data:', { name, value, type, start, expiry, description, products, categories });

    const discount = await Discount.findOneAndUpdate(
      { _id: id, org: employee.org._id },
      {
        name,
        description,
        mode: mode || 'discount',
        code,
        type,
        value,
        maxAmount,
        bogo,
        start: start ? new Date(start) : null,
        expiry: expiry ? new Date(expiry) : null,
        archivedAt: archivedAt ? new Date(archivedAt) : null,
        limits,
        products: products || [],
        categories: categories || []
      },
      { new: true }
    );

    console.log('Updated discount result:', discount);

    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json(discount);

  } catch (error) {
    console.error('Error updating discount:', error);
    return NextResponse.json(
      { error: 'Failed to update discount' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  await connectDB();
  
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const discount = await Discount.findOneAndDelete({
      _id: id,
      org: employee.org._id
    });

    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Discount deleted successfully' });

  } catch (error) {
    console.error('Error deleting discount:', error);
    return NextResponse.json(
      { error: 'Failed to delete discount' },
      { status: 500 }
    );
  }
} 
