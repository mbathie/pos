import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { Customer } from '@/models';

export async function POST(request, { params }) {
  await connectDB();
  
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if employee has permission to add credits (ADMIN or MANAGER only)
    if (employee.role !== 'ADMIN' && employee.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { amount, note } = body;

    // Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Find the customer
    const customer = await Customer.findOne({
      _id: id,
      orgs: employee.org._id
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Initialize credits structure if it doesn't exist
    if (!customer.credits) {
      customer.credits = {
        balance: 0,
        credits: [],
        debits: []
      };
    }

    // Add the credit entry
    customer.credits.credits.push({
      date: new Date(),
      employee: employee._id,
      amount: parseFloat(amount),
      note: note || ''
    });

    // Update the balance
    customer.credits.balance = (customer.credits.balance || 0) + parseFloat(amount);

    // Save the customer
    await customer.save();

    // Return the updated customer
    const updatedCustomer = await Customer.findById(id)
      .populate('credits.credits.employee', 'name')
      .populate('credits.debits.employee', 'name')
      .lean();

    return NextResponse.json(updatedCustomer);

  } catch (error) {
    console.error('Error adding credit:', error);
    return NextResponse.json(
      { error: 'Failed to add credit' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve credit history
export async function GET(request, { params }) {
  await connectDB();
  
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const customer = await Customer.findOne({
      _id: id,
      orgs: employee.org._id
    })
      .select('credits')
      .populate('credits.credits.employee', 'name')
      .populate('credits.debits.employee', 'name')
      .populate('credits.debits.transaction', 'total createdAt')
      .lean();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer.credits || { balance: 0, credits: [], debits: [] });

  } catch (error) {
    console.error('Error fetching credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}