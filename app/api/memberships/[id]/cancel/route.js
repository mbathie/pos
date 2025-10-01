import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { cancelMembership } from '@/lib/payments/cancel';

export async function POST(request, { params }) {
  console.log('\n=== API ROUTE: Cancel Membership ===');

  try {
    // Get authenticated employee
    const { employee } = await getEmployee();
    console.log('Authenticated employee:', {
      id: employee?._id,
      email: employee?.email,
      name: employee?.name
    });

    if (!employee) {
      console.error('Unauthorized - no employee found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();
    console.log('Database connected');

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    console.log('Request details:', {
      membershipId: id,
      reason: reason || 'none provided'
    });

    // Cancel the membership
    const membership = await cancelMembership({
      membershipId: id,
      employeeId: employee._id,
      reason
    });

    console.log('API: Membership cancellation completed');
    console.log('API: Returning response with cancellation date:', membership.cancellationScheduledFor);

    return NextResponse.json({
      success: true,
      membership,
      message: `Membership will be cancelled on ${new Date(membership.cancellationScheduledFor).toLocaleDateString()}`
    });
  } catch (error) {
    console.error('=== API ROUTE ERROR ===');
    console.error('Error cancelling membership:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel membership' },
      { status: 500 }
    );
  }
}
