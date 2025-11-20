import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { Schedule } from '@/models';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

// POST /api/schedules/check-overlap - Check if a class time overlaps with existing schedules
export async function POST(request) {
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { productId, datetime, duration } = await request.json();

    if (!productId || !datetime || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate start and end times
    const startTime = dayjs(datetime);
    const endTime = startTime.add(duration, 'minute');

    // Find all schedules for this product
    const existingSchedules = await Schedule.find({
      product: productId,
      org: employee.org._id
    });

    // Check for overlaps
    let hasOverlap = false;
    for (const schedule of existingSchedules) {
      const existingStart = dayjs(schedule.datetime);
      const existingEnd = existingStart.add(schedule.duration, 'minute');

      // Check if times overlap
      // Overlap occurs if:
      // - New start is between existing start and end
      // - New end is between existing start and end
      // - New time completely encompasses existing time
      // - Existing time completely encompasses new time
      if (
        startTime.isBetween(existingStart, existingEnd, null, '[)') ||
        endTime.isBetween(existingStart, existingEnd, null, '(]') ||
        (startTime.isSameOrBefore(existingStart) && endTime.isSameOrAfter(existingEnd)) ||
        (existingStart.isSameOrBefore(startTime) && existingEnd.isSameOrAfter(endTime))
      ) {
        hasOverlap = true;
        break;
      }
    }

    return NextResponse.json({ hasOverlap });
  } catch (error) {
    console.error('Error checking schedule overlap:', error);
    return NextResponse.json({ error: 'Failed to check overlap' }, { status: 500 });
  }
}
