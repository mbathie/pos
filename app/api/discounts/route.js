import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Discount } from '@/models';

export async function GET(request) {
  await connectDB();
  
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const current = searchParams.get('current');

    let query = { org: employee.org._id };

    // If current=true, only return discounts that haven't expired
    if (current === 'true') {
      const now = new Date();
      query.$or = [
        { expiry: { $gte: now } },
        { expiry: { $exists: false } },
        { expiry: null }
      ];
    }

    const discounts = await Discount.find(query)
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(discounts);

  } catch (error) {
    console.error('Error fetching discounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discounts' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  await connectDB();
  
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, value, type, expiry, description } = body;

    const discount = new Discount({
      name,
      value,
      type,
      expiry: expiry ? new Date(expiry) : null,
      description,
      org: employee.org._id
    });

    await discount.save();

    return NextResponse.json(discount, { status: 201 });

  } catch (error) {
    console.error('Error creating discount:', error);
    return NextResponse.json(
      { error: 'Failed to create discount' },
      { status: 500 }
    );
  }
} 