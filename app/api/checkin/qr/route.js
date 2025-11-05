import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Schedule, Customer, Membership } from '@/models';
import { getEmployee } from '@/lib/auth';
import { createCheckinRecord, buildCheckinResponse, getMembershipStatus } from '@/lib/checkin';
import dayjs from 'dayjs';

export async function POST(request) {
  try {
    await connectDB();

    // Authenticate employee
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerId, test = false } = await request.json();

    // DEBUG: Log raw QR code data
    console.log('=== QR CODE SCAN DEBUG ===');
    console.log('Raw customerId from QR code:', customerId);
    console.log('Type of customerId:', typeof customerId);
    console.log('Length:', customerId?.length);
    console.log('First 100 chars:', customerId?.substring(0, 100));

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Parse and validate member ID
    const memberId = parseInt(customerId, 10);
    console.log('Parsed memberId:', memberId);
    console.log('Is NaN?:', isNaN(memberId));

    if (isNaN(memberId)) {
      console.log('❌ Failed to parse member ID from:', customerId);
      return NextResponse.json({
        error: 'Invalid member ID',
        debug: {
          received: customerId,
          type: typeof customerId,
          parseAttempt: memberId
        }
      }, { status: 400 });
    }

    console.log('✅ Successfully parsed member ID:', memberId);

    // Find customer
    console.log('Searching for customer with memberId:', memberId, 'in org:', employee.org._id);
    let customer = await Customer.findOne({
      memberId: memberId,
      orgs: employee.org._id
    });

    console.log('First query result:', customer ? `Found: ${customer.name} (${customer._id})` : 'Not found');

    if (!customer) {
      console.log('Trying fallback search without org filter...');
      customer = await Customer.findOne({ memberId });
      console.log('Fallback query result:', customer ? `Found: ${customer.name} (${customer._id})` : 'Not found');

      if (customer?.orgs) {
        console.log('Customer orgs:', customer.orgs);
        console.log('Employee org:', employee.org._id);
        const hasOrgAccess = customer.orgs.some(orgId => orgId.toString() === employee.org._id.toString());
        console.log('Has org access:', hasOrgAccess);

        if (!hasOrgAccess) {
          customer = null;
        }
      }
    }

    if (!customer) {
      console.log('❌ Customer not found for memberId:', memberId);

      // Additional debug: check if customer exists with different memberId
      const allCustomersWithSimilarId = await Customer.find({
        memberId: { $gte: memberId - 10, $lte: memberId + 10 }
      }).select('memberId name').limit(5);
      console.log('Nearby member IDs in database:', allCustomersWithSimilarId);

      return NextResponse.json({
        error: 'Customer not found',
        debug: {
          searchedMemberId: memberId,
          orgId: employee.org._id.toString(),
          nearbyIds: allCustomersWithSimilarId
        }
      }, { status: 404 });
    }

    console.log('✅ Customer found:', {
      id: customer._id,
      name: customer.name,
      memberId: customer.memberId
    });

    // Time window setup
    const now = new Date();
    const thirtyMinutesBefore = new Date(now.getTime() - 30 * 60 * 1000);
    const thirtyMinutesAfter = new Date(now.getTime() + 30 * 60 * 1000);

    // Search for scheduled classes
    const searchQuery = test ? {
      org: employee.org._id,
      'locations.classes.customers.customer': customer._id
    } : {
      org: employee.org._id,
      'locations.classes.customers': {
        $elemMatch: {
          customer: customer._id,
          status: 'confirmed'
        }
      }
    };

    const schedules = await Schedule.find(searchQuery).populate('product');

    // Get membership status
    const membership = await Membership.findOne({
      customer: customer._id,
      org: employee.org._id,
      status: { $in: ['active', 'suspended', 'expired', 'cancelled'] }
    }).populate('product').populate('location');

    const membershipStatus = getMembershipStatus(membership);

    // Process based on what we found
    if (!schedules || schedules.length === 0) {
      // No schedules found - handle membership-only check-in
      return handleMembershipOnlyCheckin(customer, membership, membershipStatus, employee.org._id);
    }

    // Look for class in time window
    const classResult = findClassInWindow(schedules, customer._id, now, thirtyMinutesBefore, thirtyMinutesAfter, test);

    if (!classResult.foundClass) {
      // No class in window - handle based on membership status
      return handleNoClassInWindow(customer, membership, membershipStatus, employee.org._id, schedules, now);
    }

    // Found a class - handle class check-in
    return handleClassCheckin(classResult, customer, membership, membershipStatus, employee.org._id, now, test);

  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// Helper function to find class in time window
function findClassInWindow(schedules, customerId, now, thirtyMinutesBefore, thirtyMinutesAfter, test) {
  let foundClass = null;
  let foundSchedule = null;
  let foundLocation = null;
  let foundProduct = null;

  for (const schedule of schedules) {
    for (const location of schedule.locations) {
      for (const classItem of location.classes) {
        const classTime = new Date(classItem.datetime);

        const isInWindow = test ?
          classTime > now : // Test mode: any future class
          (classTime >= thirtyMinutesBefore && classTime <= thirtyMinutesAfter);

        if (isInWindow) {
          const customerInClass = classItem.customers.find(c => {
            const isCustomer = c.customer.toString() === customerId.toString();
            return test ? isCustomer : (isCustomer && c.status === 'confirmed');
          });

          if (customerInClass) {
            foundClass = classItem;
            foundSchedule = schedule;
            foundLocation = location;
            foundProduct = schedule.product;
            break;
          }
        }
      }
      if (foundClass) break;
    }
    if (foundClass) break;
  }

  return { foundClass, foundSchedule, foundLocation, foundProduct };
}

// Handle membership-only check-in (no schedules found)
async function handleMembershipOnlyCheckin(customer, membership, membershipStatus, orgId) {
  if (!membershipStatus) {
    return NextResponse.json(buildCheckinResponse({
      success: false,
      customer,
      status: 'no-scheduled-classes',
      message: 'No classes, courses or memberships found'
    }));
  }

  if (membershipStatus.status === 'suspended') {
    const checkin = await createCheckinRecord({
      customerId: customer._id,
      productId: membership.product._id,
      orgId,
      type: 'failed',
      failureReason: 'membership-suspended'
    });

    return NextResponse.json(buildCheckinResponse({
      success: false,
      customer,
      status: 'membership-suspended',
      message: membershipStatus.message,
      checkinId: checkin._id,
      suspendedMembership: {
        product: membershipStatus.product,
        suspendedUntil: membershipStatus.suspendedUntil,
        status: membershipStatus.status,
        message: membershipStatus.message
      }
    }));
  }

  if (membershipStatus.isValid) {
    const checkin = await createCheckinRecord({
      customerId: customer._id,
      productId: membership.product._id,
      orgId,
      type: 'membership'
    });

    return NextResponse.json(buildCheckinResponse({
      success: true,
      customer,
      status: 'membership-checked-in',
      message: 'Membership check-in successful',
      checkinId: checkin._id,
      membershipCheckin: {
        product: membershipStatus.product,
        checkinId: checkin._id
      }
    }));
  }

  // Expired or invalid membership
  const checkin = await createCheckinRecord({
    customerId: customer._id,
    productId: membership.product._id,
    orgId,
    type: 'failed',
    failureReason: 'membership-expired',
    classInfo: {
      datetime: new Date(),
      location: membership.location?._id || null
    }
  });

  return NextResponse.json(buildCheckinResponse({
    success: false,
    customer,
    status: 'membership-expired',
    message: membershipStatus.message,
    checkinId: checkin._id
  }));
}

// Handle no class in window
async function handleNoClassInWindow(customer, membership, membershipStatus, orgId, schedules, now) {
  // Find next upcoming class
  let nextClassInfo = null;
  for (const schedule of schedules) {
    for (const location of schedule.locations) {
      for (const classItem of location.classes) {
        const classTime = new Date(classItem.datetime);
        if (classTime > now) {
          const customerInClass = classItem.customers.find(c =>
            c.customer.toString() === customer._id.toString()
          );
          if (customerInClass && (!nextClassInfo || classTime < nextClassInfo.datetime)) {
            nextClassInfo = {
              datetime: classTime,
              productName: schedule.product?.name || 'Class/Course',
              timeUntil: Math.round((classTime - now) / 1000 / 60)
            };
          }
        }
      }
    }
  }

  if (membershipStatus?.status === 'suspended') {
    const checkin = await createCheckinRecord({
      customerId: customer._id,
      productId: membership.product._id,
      orgId,
      type: 'failed',
      failureReason: 'membership-suspended'
    });

    return NextResponse.json(buildCheckinResponse({
      success: false,
      customer,
      status: 'membership-suspended',
      message: membershipStatus.message,
      checkinId: checkin._id,
      nextClass: nextClassInfo,
      suspendedMembership: {
        product: membershipStatus.product,
        suspendedUntil: membershipStatus.suspendedUntil,
        status: membershipStatus.status
      }
    }));
  }

  return NextResponse.json(buildCheckinResponse({
    success: false,
    customer,
    status: 'no-class-in-window',
    message: 'No class within check-in window (30 minutes before/after class time)',
    nextClass: nextClassInfo,
    hasActiveMembership: membershipStatus?.isValid || false
  }));
}

// Handle class check-in
async function handleClassCheckin(classResult, customer, membership, membershipStatus, orgId, now, test) {
  const { foundClass, foundSchedule, foundLocation, foundProduct } = classResult;

  // Update schedule status
  const customerIndex = foundClass.customers.findIndex(c =>
    c.customer.toString() === customer._id.toString()
  );

  if (customerIndex !== -1) {
    // Find the correct indices by matching IDs
    const locationIndex = foundSchedule.locations.findIndex(l =>
      l._id.toString() === foundLocation._id.toString()
    );
    const classIndex = foundLocation.classes.findIndex(c =>
      c._id.toString() === foundClass._id.toString()
    );

    if (locationIndex !== -1 && classIndex !== -1) {
      const updatePath = `locations.${locationIndex}.classes.${classIndex}.customers.${customerIndex}.status`;

      await Schedule.findByIdAndUpdate(foundSchedule._id, {
        $set: { [updatePath]: 'checked in' }
      });
    } else {
      console.error('Could not find location or class indices for update');
    }
  }

  // Create class check-in
  const classCheckin = await createCheckinRecord({
    customerId: customer._id,
    productId: foundProduct._id,
    orgId,
    type: 'class',
    scheduleId: foundSchedule._id,
    classInfo: {
      datetime: foundClass.datetime,
      location: foundLocation.location
    }
  });

  // Handle membership check-in if active
  let membershipCheckinInfo = null;
  let suspendedMembershipInfo = null;

  if (membershipStatus) {
    if (membershipStatus.status === 'suspended') {
      suspendedMembershipInfo = {
        product: membershipStatus.product,
        suspendedUntil: membershipStatus.suspendedUntil,
        status: membershipStatus.status,
        message: membershipStatus.message
      };
    } else if (membershipStatus.isValid) {
      const membershipCheckin = await createCheckinRecord({
        customerId: customer._id,
        productId: membership.product._id,
        orgId,
        type: 'membership',
        classInfo: {
          datetime: now,
          location: foundLocation.location
        }
      });

      membershipCheckinInfo = {
        product: membershipStatus.product,
        checkinId: membershipCheckin._id
      };
    }
  }

  return NextResponse.json(buildCheckinResponse({
    success: true,
    customer,
    product: {
      _id: foundProduct._id,
      name: foundProduct.name
    },
    classTime: foundClass.datetime,
    checkinId: classCheckin._id,
    membershipCheckin: membershipCheckinInfo,
    suspendedMembership: suspendedMembershipInfo,
    status: 'checked-in',
    message: test ? 'Test check-in successful' : 'Check-in successful',
    testMode: test
  }));
}