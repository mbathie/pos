import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { pauseMembership } from '@/lib/payments/suspend';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { employee } = await getEmployee();

    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: membershipId } = await params;
    const { suspensionDays, note, customerId, pauseStartDate } = await request.json();

    // Pause the membership
    const result = await pauseMembership({
      customerId,
      membershipId,
      suspensionDays,
      employeeId: employee._id,
      note,
      pauseStartDate, // Pass the scheduled pause start date
      org: employee.org
    });

    return NextResponse.json({
      success: true,
      membership: result.membership,
      note: result.membership.stripeSubscriptionId && !result.stripeUpdated
        ? 'Membership paused locally. Stripe subscription update pending.'
        : null
    });
  } catch (error) {
    console.error('Error pausing membership:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to pause membership' },
      { status: 400 }
    );
  }
}