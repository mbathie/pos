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

    // If current=true, only return discounts that are active now
    if (current === 'true') {
      const now = new Date();
      // Active when: (no start or start <= now) AND (no expiry or expiry >= now)
      query.$and = [
        { $or: [ { start: { $lte: now } }, { start: { $exists: false } }, { start: null } ] },
        { $or: [ { expiry: { $gte: now } }, { expiry: { $exists: false } }, { expiry: null } ] }
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
    const {
      name,
      description,
      mode,
      code,
      autoAssign,
      type,
      value,
      maxAmount,
      start,
      expiry,
      archivedAt,
      daysOfWeek,
      limits,
      products,
      categories,
      musts,
      adjustments,
      requireCustomer
    } = body;

    // Build the discount object with new schema support
    const discountData = {
      name,
      description,
      mode: mode || 'discount',
      autoAssign: mode === 'surcharge' ? true : (autoAssign === true), // Surcharges always auto-assign
      start: start ? new Date(start) : null,
      expiry: expiry ? new Date(expiry) : null,
      archivedAt: archivedAt ? new Date(archivedAt) : null,
      daysOfWeek,
      org: employee.org._id
    };

    // Only set code if it has a value (to avoid unique constraint issues with null)
    if (code && code.trim()) {
      discountData.code = code.trim();
    }

    // Handle new schema with musts and adjustments
    if (musts || adjustments) {
      discountData.musts = musts || { products: [], categories: [] };
      discountData.adjustments = adjustments || [];
      
      // Keep legacy fields for backwards compatibility if provided
      if (type && value !== undefined) {
        discountData.type = type;
        discountData.value = value;
        discountData.maxAmount = maxAmount;
      }
    } else {
      // Legacy schema support
      discountData.type = type;
      discountData.value = value;
      discountData.maxAmount = maxAmount;
      discountData.products = products || [];
      discountData.categories = categories || [];
    }

    // Handle limits with new structure
    if (limits) {
      discountData.limits = limits;
    }

    // Add requireCustomer field
    discountData.requireCustomer = requireCustomer || false;

    const discount = new Discount(discountData);
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
