import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Transaction } from '@/models';

export async function GET(request, { params }) {
  await connectDB();
  
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const transaction = await Transaction.findOne({ 
      _id: id,
      org: employee.org._id 
    })
      .populate('discount', 'name value type')
      .populate('employee', 'name')
      .populate('customer', 'name email phone')
      .lean();

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json(transaction);

  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction' },
      { status: 500 }
    );
  }
} 