import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { reactivateMembership } from '@/lib/payments/cancel';

export async function POST(request, { params }) {
  try {
    // Get authenticated employee
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;

    // Reactivate the membership
    const membership = await reactivateMembership({
      membershipId: id,
      employeeId: employee._id
    });

    return NextResponse.json({
      success: true,
      membership,
      message: 'Membership reactivated successfully'
    });
  } catch (error) {
    console.error('Error reactivating membership:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reactivate membership' },
      { status: 500 }
    );
  }
}
