import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { Schedule, Customer, Membership, PrepaidPass, Product } from '@/models';
import { getEmployee } from '@/lib/auth';
import { getMembershipStatus } from '@/lib/checkin';

export async function POST(request) {
  try {
    await connectDB();

    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerId, test = false } = await request.json();

    // Handle prepaid pass QR code (PP: prefix) — keep existing flow as fallback
    if (typeof customerId === 'string' && customerId.startsWith('PP:')) {
      const passCode = customerId.substring(3);

      const pass = await PrepaidPass.findOne({
        code: passCode,
        org: employee.org._id
      }).populate('customer', 'name email memberId photo');

      if (!pass) {
        return NextResponse.json({ error: 'Prepaid pass not found' }, { status: 404 });
      }

      if (pass.status === 'depleted' || pass.remainingPasses <= 0) {
        return NextResponse.json({
          success: false,
          status: 'prepaid-depleted',
          message: 'This prepaid pass has been fully used',
          customer: pass.customer ? {
            name: pass.customer.name,
            memberId: pass.customer.memberId,
            photo: pass.customer.photo
          } : null
        });
      }

      return NextResponse.json({
        success: true,
        status: 'prepaid-select',
        message: 'Select products to redeem',
        products: pass.products,
        remainingPasses: pass.remainingPasses,
        totalPasses: pass.totalPasses,
        passCode: passCode,
        customer: pass.customer ? {
          name: pass.customer.name,
          memberId: pass.customer.memberId,
          photo: pass.customer.photo
        } : null
      });
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Parse and validate member ID
    const memberId = parseInt(customerId, 10);
    if (isNaN(memberId)) {
      return NextResponse.json({ error: 'Invalid member ID' }, { status: 400 });
    }

    // Find customer
    let customer = await Customer.findOne({
      memberId: memberId,
      orgs: employee.org._id
    });

    if (!customer) {
      customer = await Customer.findOne({ memberId });
      if (customer?.orgs) {
        const hasOrgAccess = customer.orgs.some(orgId => orgId.toString() === employee.org._id.toString());
        if (!hasOrgAccess) {
          customer = null;
        }
      }
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const org = employee.org._id;
    const now = new Date();
    const thirtyMinutesBefore = new Date(now.getTime() - 30 * 60 * 1000);
    const thirtyMinutesAfter = new Date(now.getTime() + 30 * 60 * 1000);

    // Query all product types at once
    const [schedules, memberships, prepaidPasses] = await Promise.all([
      Schedule.find({
        org,
        'locations.classes.customers.customer': customer._id
      }).populate('product'),
      Membership.find({
        customer: customer._id,
        org,
        status: { $in: ['active', 'suspended'] }
      }).populate('product').populate('location'),
      PrepaidPass.find({
        customer: customer._id,
        org,
        status: 'active'
      }).populate('pack', 'name')
    ]);

    // Build classes array — filter to time window (or all future in test mode)
    const classes = [];
    for (const schedule of schedules) {
      for (let li = 0; li < schedule.locations.length; li++) {
        const location = schedule.locations[li];
        for (let ci = 0; ci < location.classes.length; ci++) {
          const classItem = location.classes[ci];
          const classTime = new Date(classItem.datetime);

          const isInWindow = test
            ? classTime > now
            : (classTime >= thirtyMinutesBefore && classTime <= thirtyMinutesAfter);

          if (!isInWindow) continue;

          const customerEntry = classItem.customers.find(c =>
            c.customer.toString() === customer._id.toString()
          );

          if (!customerEntry) continue;
          // In non-test mode, skip non-confirmed (unless already checked in)
          if (!test && customerEntry.status !== 'confirmed' && customerEntry.status !== 'checked in') continue;

          classes.push({
            scheduleId: schedule._id,
            locationIndex: li,
            classIndex: ci,
            product: { _id: schedule.product._id, name: schedule.product.name },
            datetime: classItem.datetime,
            type: schedule.product.type || 'class',
            alreadyCheckedIn: customerEntry.status === 'checked in'
          });
        }
      }
    }

    // Build memberships array
    const membershipList = memberships.map(m => {
      const status = getMembershipStatus(m);
      return {
        membershipId: m._id,
        product: { _id: m.product._id, name: m.product.name },
        status: status.status,
        isValid: status.isValid,
        message: status.message,
        location: m.location ? { _id: m.location._id, name: m.location.name } : null,
        suspendedUntil: status.suspendedUntil
      };
    });

    // Build prepaid passes array — look up product thumbnails
    const allPrepaidProductIds = prepaidPasses.flatMap(p => p.products.map(prod => prod._id));
    const prepaidProductDocs = allPrepaidProductIds.length > 0
      ? await Product.find({ _id: { $in: allPrepaidProductIds } }, 'thumbnail').lean()
      : [];
    const prepaidThumbnailMap = Object.fromEntries(prepaidProductDocs.map(p => [p._id.toString(), p.thumbnail]));

    const prepaidList = prepaidPasses.map(p => ({
      passId: p._id,
      passCode: p.code,
      packName: p.pack?.name || 'Prepaid Pass',
      remainingPasses: p.remainingPasses,
      totalPasses: p.totalPasses,
      products: p.products.map(prod => ({ _id: prod._id, name: prod.name, thumbnail: prepaidThumbnailMap[prod._id.toString()] || null }))
    }));

    const hasAnything = classes.length > 0 || membershipList.length > 0 || prepaidList.length > 0;

    if (!hasAnything) {
      return NextResponse.json({
        success: false,
        status: 'no-products',
        message: 'No classes, memberships, or prepaid passes found',
        customer: {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          memberId: customer.memberId,
          photo: customer.photo
        },
        classes: [],
        memberships: [],
        prepaidPasses: []
      });
    }

    return NextResponse.json({
      success: true,
      status: 'unified-select',
      message: 'Select items to check in',
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        memberId: customer.memberId,
        photo: customer.photo
      },
      classes,
      memberships: membershipList,
      prepaidPasses: prepaidList,
      test
    });

  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
