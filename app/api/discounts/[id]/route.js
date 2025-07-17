import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Discount } from '@/models';

export async function PUT(request, { params }) {
  await connectDB();
  
  const { employee } = await getEmployee();
  const { id } = params;
  const body = await request.json();
  
  const { name, value, type, description, expiry } = body;

  // Validation
  if (!name || value === undefined || !type) {
    return NextResponse.json({ error: 'Name, value, and type are required' }, { status: 400 });
  }

  if (!['percent', 'amount'].includes(type)) {
    return NextResponse.json({ error: 'Type must be either "percent" or "amount"' }, { status: 400 });
  }

  if (typeof value !== 'number' || value < 0) {
    return NextResponse.json({ error: 'Value must be a positive number' }, { status: 400 });
  }

  if (type === 'percent' && value > 100) {
    return NextResponse.json({ error: 'Percentage value cannot exceed 100' }, { status: 400 });
  }

  try {
    const discount = await Discount.findOneAndUpdate(
      { _id: id, org: employee.org._id },
      { 
        name, 
        value, 
        type, 
        description,
        expiry: expiry ? new Date(expiry) : null
      },
      { new: true }
    );

    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json(discount);
  } catch (error) {
    // Check for duplicate key error
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Discount with this name already exists' }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  await connectDB();
  
  const { employee } = await getEmployee();
  const { id } = params;

  try {
    const discount = await Discount.findOneAndDelete({ _id: id, org: employee.org._id });

    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Discount deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 