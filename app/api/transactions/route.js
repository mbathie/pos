import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Transaction } from '@/models';

export async function GET(request) {
  await connectDB();
  
  try {
    const { employee } = await getEmployee();
    console.log(employee)
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const hours = searchParams.get('hours');
    const paymentMethod = searchParams.get('paymentMethod');
    const customerId = searchParams.get('customerId');
    const locationId = searchParams.get('locationId');

    let query = { 
      org: employee.org._id
    };

    // Filter by location
    // If locationId is provided and not 'all', use it
    // Otherwise use employee's selected location for backward compatibility
    if (locationId && locationId !== 'all') {
      query.location = locationId;
    } else if (!locationId && !customerId) {
      // For backward compatibility - if no locationId param, use employee's selected location
      query.location = employee.selectedLocationId;
    }
    // Note: When searching by customer or 'all' locations, don't filter by location

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by payment method
    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = paymentMethod;
    }

    // Filter by customer
    if (customerId) {
      query.customer = customerId;
    }

    // Filter by time range (hours)
    if (hours) {
      const hoursAgo = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
      query.createdAt = { $gte: hoursAgo };
    }

    const transactions = await Transaction.find(query)
      .populate('adjustments.discounts.items.id', 'name value type mode')
      .populate('adjustments.surcharges.items.id', 'name value type mode')
      .populate('employee', 'name')
      .populate('customer', 'name email phone')
      .populate('company', 'name')
      .populate('location', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(transactions);

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
} 