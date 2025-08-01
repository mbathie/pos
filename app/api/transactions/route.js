import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Transaction } from '@/models';

export async function GET(request) {
  await connectDB();
  
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const hours = searchParams.get('hours');
    const paymentMethod = searchParams.get('paymentMethod');
    const customerId = searchParams.get('customerId');

    let query = { org: employee.org._id };

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
      .populate('discount', 'name value type')
      .populate('employee', 'name')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    console.log(transactions);

    return NextResponse.json(transactions);

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
} 