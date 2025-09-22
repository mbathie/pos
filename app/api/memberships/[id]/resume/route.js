import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { resumeMembership } from '@/lib/payments/suspend';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { employee } = await getEmployee();

    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: membershipId } = await params;

    // Resume the membership
    const result = await resumeMembership({
      membershipId,
      employeeId: employee._id,
      org: employee.org
    });

    return NextResponse.json({
      success: true,
      membership: result.membership || result, // Handle both old and new return formats
      creditAdjustment: result.creditAdjustment,
      stripeUpdated: result.stripeUpdated
    });
  } catch (error) {
    console.error('Error resuming membership:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resume membership' },
      { status: 400 }
    );
  }
}