import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { getRemainingSupensionDays } from '@/lib/payments/suspend';
import { Membership } from '@/models';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { employee } = await getEmployee();

    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: membershipId } = await params;

    // Get the membership to find the customer
    const membership = await Membership.findById(membershipId);
    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    // Get remaining suspension days
    const suspensionInfo = await getRemainingSupensionDays(
      membership.customer,
      membershipId,
      employee.org
    );

    return NextResponse.json({
      ...suspensionInfo,
      membership: {
        _id: membership._id,
        amount: membership.amount,
        unit: membership.unit,
        nextBillingDate: membership.nextBillingDate,
        status: membership.status
      }
    });
  } catch (error) {
    console.error('Error getting suspension info:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get suspension info' },
      { status: 400 }
    );
  }
}