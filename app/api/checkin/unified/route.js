import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Customer, Membership } from '@/models';
import { getEmployee } from '@/lib/auth';
import {
  createCheckinRecord,
  getMembershipStatus,
  processClassCheckin,
  processPrepaidRedemption
} from '@/lib/checkin';

export async function POST(request) {
  try {
    await connectDB();

    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerId, classes = [], membershipIds = [], prepaidRedemptions = [] } = await request.json();

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const totalItems = classes.length + membershipIds.length + prepaidRedemptions.reduce((sum, r) => sum + (r.productIds?.length || 0), 0);
    if (totalItems === 0) {
      return NextResponse.json({ error: 'No items selected' }, { status: 400 });
    }

    // Validate customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const orgId = employee.org._id;
    const results = {
      classes: [],
      memberships: [],
      prepaid: []
    };

    // 1. Process class check-ins
    for (const cls of classes) {
      try {
        const result = await processClassCheckin({
          scheduleId: cls.scheduleId,
          locationIndex: cls.locationIndex,
          classIndex: cls.classIndex,
          customerId,
          orgId
        });

        results.classes.push({
          success: true,
          scheduleId: cls.scheduleId,
          product: result.product?.name,
          alreadyCheckedIn: result.alreadyCheckedIn
        });
      } catch (error) {
        results.classes.push({
          success: false,
          scheduleId: cls.scheduleId,
          error: error.message
        });
      }
    }

    // 2. Process membership check-ins
    for (const membershipId of membershipIds) {
      try {
        const membership = await Membership.findById(membershipId)
          .populate('product')
          .populate('location');

        if (!membership) {
          results.memberships.push({ success: false, membershipId, error: 'Membership not found' });
          continue;
        }

        const status = getMembershipStatus(membership);

        if (!status.isValid) {
          results.memberships.push({
            success: false,
            membershipId,
            product: membership.product?.name,
            error: status.message
          });
          continue;
        }

        const checkin = await createCheckinRecord({
          customerId,
          productId: membership.product._id,
          orgId,
          type: 'membership'
        });

        results.memberships.push({
          success: true,
          membershipId,
          product: membership.product?.name,
          checkinId: checkin._id
        });
      } catch (error) {
        results.memberships.push({
          success: false,
          membershipId,
          error: error.message
        });
      }
    }

    // 3. Process prepaid redemptions
    for (const redemption of prepaidRedemptions) {
      try {
        const result = await processPrepaidRedemption({
          passCode: redemption.passCode,
          productIds: redemption.productIds,
          orgId
        });

        results.prepaid.push({
          success: true,
          passCode: redemption.passCode,
          remainingPasses: result.remainingPasses,
          totalPasses: result.totalPasses,
          redeemedProducts: result.redeemedProducts,
          depleted: result.depleted
        });
      } catch (error) {
        results.prepaid.push({
          success: false,
          passCode: redemption.passCode,
          error: error.message
        });
      }
    }

    // Determine overall success
    const allResults = [...results.classes, ...results.memberships, ...results.prepaid];
    const allSuccess = allResults.every(r => r.success);
    const anySuccess = allResults.some(r => r.success);

    return NextResponse.json({
      success: anySuccess,
      status: allSuccess ? 'all-success' : anySuccess ? 'partial-success' : 'all-failed',
      message: allSuccess
        ? `Successfully checked in ${allResults.length} item${allResults.length > 1 ? 's' : ''}`
        : anySuccess
          ? 'Some items failed to check in'
          : 'All check-ins failed',
      results
    });

  } catch (error) {
    console.error('Unified check-in error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
