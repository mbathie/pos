import { NextResponse } from 'next/server';
import { getEmployee } from '@/lib/auth';
import { connectDB } from '@/lib/mongoose';
import { Schedule } from '@/models';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// POST /api/schedules/check-overlap - Check if a class time overlaps with existing schedules
export async function POST(request) {
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { productId, datetime, duration } = await request.json();

    console.log('=== OVERLAP CHECK REQUEST ===');
    console.log('Product ID:', productId);
    console.log('Requested datetime:', datetime);
    console.log('Duration (min):', duration);

    if (!productId || !datetime || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Calculate start and end times
    const startTime = dayjs(datetime);
    const endTime = startTime.add(duration, 'minute');

    console.log('Calculated time range:');
    console.log('  Start:', startTime.format('YYYY-MM-DD HH:mm'));
    console.log('  End:', endTime.format('YYYY-MM-DD HH:mm'));

    // Find all schedules for this product
    const existingSchedules = await Schedule.find({
      product: productId,
      org: employee.org._id
    });

    console.log(`Found ${existingSchedules.length} existing schedules for this product`);

    // Check for overlaps
    let hasOverlap = false;
    let overlapDetails = null;

    for (const schedule of existingSchedules) {
      const existingStart = dayjs(schedule.datetime);

      // Skip schedules without a valid duration (regular scheduled classes)
      if (!schedule.duration || schedule.duration <= 0) {
        console.log(`\nSkipping schedule ${schedule._id} (no duration - regular scheduled class)`);
        continue;
      }

      const existingEnd = existingStart.add(schedule.duration, 'minute');

      console.log(`\nChecking schedule ${schedule._id}:`);
      console.log('  Existing start:', existingStart.format('YYYY-MM-DD HH:mm'));
      console.log('  Existing end:', existingEnd.format('YYYY-MM-DD HH:mm'));
      console.log('  Duration:', schedule.duration, 'min');

      // Check if times overlap
      // Overlap occurs if:
      // - New start is between existing start and end
      // - New end is between existing start and end
      // - New time completely encompasses existing time
      // - Existing time completely encompasses new time
      const check1 = startTime.isBetween(existingStart, existingEnd, null, '[)');
      const check2 = endTime.isBetween(existingStart, existingEnd, null, '(]');
      const check3 = startTime.isSameOrBefore(existingStart) && endTime.isSameOrAfter(existingEnd);
      const check4 = existingStart.isSameOrBefore(startTime) && existingEnd.isSameOrAfter(endTime);

      console.log('  Overlap checks:');
      console.log('    New start in existing range:', check1);
      console.log('    New end in existing range:', check2);
      console.log('    New encompasses existing:', check3);
      console.log('    Existing encompasses new:', check4);

      if (check1 || check2 || check3 || check4) {
        hasOverlap = true;
        overlapDetails = {
          scheduleId: schedule._id,
          existingStart: existingStart.format('YYYY-MM-DD HH:mm'),
          existingEnd: existingEnd.format('YYYY-MM-DD HH:mm'),
          checks: { check1, check2, check3, check4 }
        };
        console.log('  ⚠️  OVERLAP DETECTED!');
        break;
      } else {
        console.log('  ✓ No overlap');
      }
    }

    console.log('\n=== RESULT ===');
    console.log('Has overlap:', hasOverlap);
    if (overlapDetails) {
      console.log('Overlap details:', overlapDetails);
    }
    console.log('==================\n');

    return NextResponse.json({ hasOverlap });
  } catch (error) {
    console.error('Error checking schedule overlap:', error);
    return NextResponse.json({ error: 'Failed to check overlap' }, { status: 500 });
  }
}
