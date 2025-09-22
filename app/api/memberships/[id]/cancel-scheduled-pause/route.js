import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Membership } from '@/models';
import { getEmployee } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const { employee } = await getEmployee();

    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find and update the membership
    const membership = await Membership.findOne({
      _id: id,
      org: employee.org._id
    });

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    // Check if there's a scheduled pause to cancel
    if (!membership.scheduledPauseDate) {
      return NextResponse.json({ error: 'No scheduled pause to cancel' }, { status: 400 });
    }

    // Clear the scheduled pause fields
    membership.scheduledPauseDate = null;
    membership.scheduledResumeDate = null;
    membership.scheduledPauseDays = null;

    // Add a note about the cancellation in suspensions history if there's a scheduled entry
    if (membership.suspensions && membership.suspensions.length > 0) {
      const lastSuspension = membership.suspensions[membership.suspensions.length - 1];
      if (lastSuspension.scheduledPause && !lastSuspension.pausedAt) {
        // Remove the scheduled suspension that hasn't been executed yet
        membership.suspensions.pop();
      }
    }

    await membership.save();

    return NextResponse.json({
      success: true,
      message: 'Scheduled pause cancelled successfully',
      membership
    });

  } catch (error) {
    console.error('Error cancelling scheduled pause:', error);
    return NextResponse.json(
      { error: 'Failed to cancel scheduled pause' },
      { status: 500 }
    );
  }
}