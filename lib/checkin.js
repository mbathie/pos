import { Checkin, Schedule, PrepaidPass } from '@/models';

/**
 * Create a check-in record with standardized logic
 * @param {Object} params - Check-in parameters
 * @param {string} params.customerId - Customer ID
 * @param {string} params.productId - Product ID
 * @param {string} params.orgId - Organization ID
 * @param {string} params.type - Type of check-in: 'class', 'membership', 'failed'
 * @param {Object} params.classInfo - Class information (optional)
 * @param {string} params.scheduleId - Schedule ID (optional, for class check-ins)
 * @param {string} params.failureReason - Reason for failure (for failed check-ins)
 * @param {string} params.method - Check-in method (default: 'qr-code')
 */
export async function createCheckinRecord({
  customerId,
  productId,
  orgId,
  type,
  classInfo = null,
  scheduleId = null,
  failureReason = null,
  method = 'qr-code'
}) {
  const checkinData = {
    customer: customerId,
    product: productId,
    org: orgId,
    method,
    schedule: scheduleId,
    class: classInfo
  };

  // Set status and success based on type
  switch (type) {
    case 'class':
    case 'membership':
      checkinData.status = 'checked-in';
      break;
    case 'failed':
      checkinData.status = failureReason === 'membership-suspended' ? 'denied' : 'no-show';
      checkinData.success = {
        status: false,
        reason: failureReason
      };
      break;
    default:
      throw new Error(`Invalid check-in type: ${type}`);
  }

  const checkinRecord = new Checkin(checkinData);
  await checkinRecord.save();

  console.log(`${type} check-in created:`, checkinRecord._id);
  return checkinRecord;
}

/**
 * Build standardized check-in response
 * @param {Object} params - Response parameters
 */
export function buildCheckinResponse({
  success,
  customer,
  product = null,
  classTime = null,
  checkinId = null,
  membershipCheckin = null,
  suspendedMembership = null,
  status,
  message,
  nextClass = null,
  testMode = false
}) {
  const response = {
    success,
    customer: {
      _id: customer._id,
      name: customer.name,
      email: customer.email,
      memberId: customer.memberId,
      photo: customer.photo
    },
    status,
    message
  };

  // Add optional fields only if they exist
  if (product) response.product = product;
  if (classTime) response.classTime = classTime;
  if (checkinId) response.checkinId = checkinId;
  if (membershipCheckin) response.membershipCheckin = membershipCheckin;
  if (suspendedMembership) response.suspendedMembership = suspendedMembership;
  if (nextClass) response.nextClass = nextClass;
  if (testMode) response.testMode = testMode;

  return response;
}

/**
 * Check membership status and return structured info
 * @param {Object} membership - Membership document
 * @returns {Object} Membership status info
 */
export function getMembershipStatus(membership) {
  if (!membership) return null;

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let status = membership.status;
  let isValid = false;
  let message = '';

  if (membership.status === 'suspended') {
    message = `Membership is suspended until ${new Date(membership.suspendedUntil).toLocaleDateString()}`;
  } else if (membership.status === 'active') {
    if (membership.nextBillingDate) {
      const nextBilling = new Date(membership.nextBillingDate);
      nextBilling.setHours(0, 0, 0, 0);

      if (today > nextBilling) {
        status = 'expired';
        message = 'Membership has expired';
      } else {
        isValid = true;
        message = 'Membership is active';
      }
    } else {
      isValid = true;
      message = 'Membership is active';
    }
  } else if (membership.status === 'expired' || membership.status === 'cancelled') {
    message = `Membership is ${membership.status}`;
  }

  return {
    status,
    isValid,
    message,
    product: membership.product?.name,
    nextBillingDate: membership.nextBillingDate,
    suspendedUntil: membership.suspendedUntil
  };
}

/**
 * Process a class check-in: update schedule status + create checkin record
 */
export async function processClassCheckin({ scheduleId, locationIndex, classIndex, customerId, orgId }) {
  const schedule = await Schedule.findById(scheduleId).populate('product');
  if (!schedule) throw new Error('Schedule not found');

  const location = schedule.locations[locationIndex];
  if (!location) throw new Error('Location not found');

  const classItem = location.classes[classIndex];
  if (!classItem) throw new Error('Class not found');

  const customerIndex = classItem.customers.findIndex(c =>
    c.customer.toString() === customerId.toString()
  );

  if (customerIndex === -1) throw new Error('Customer not found in class');

  // Check if already checked in
  if (classItem.customers[customerIndex].status === 'checked in') {
    return { alreadyCheckedIn: true, product: schedule.product };
  }

  // Update schedule customer status
  const updatePath = `locations.${locationIndex}.classes.${classIndex}.customers.${customerIndex}.status`;
  await Schedule.findByIdAndUpdate(scheduleId, {
    $set: { [updatePath]: 'checked in' }
  });

  // Create checkin record
  const checkin = await createCheckinRecord({
    customerId,
    productId: schedule.product._id,
    orgId,
    type: 'class',
    scheduleId,
    classInfo: {
      datetime: classItem.datetime,
      location: location.location
    }
  });

  return { checkin, product: schedule.product, alreadyCheckedIn: false };
}

/**
 * Process a prepaid pass redemption: deduct passes, record redemption, create checkin records
 */
export async function processPrepaidRedemption({ passCode, productIds, orgId }) {
  const pass = await PrepaidPass.findOne({ code: passCode, org: orgId });
  if (!pass) throw new Error('Prepaid pass not found');

  if (pass.status === 'depleted' || pass.remainingPasses <= 0) {
    throw new Error('Prepaid pass has been fully used');
  }

  if (productIds.length > pass.remainingPasses) {
    throw new Error(`Not enough passes remaining. Have ${pass.remainingPasses}, need ${productIds.length}`);
  }

  const selectedProducts = pass.products.filter(p =>
    productIds.includes(p._id.toString())
  );

  if (selectedProducts.length !== productIds.length) {
    throw new Error('Invalid product selection');
  }

  // Deduct passes
  pass.remainingPasses -= productIds.length;

  // Add redemption record
  pass.redemptions.push({
    date: new Date(),
    products: selectedProducts.map(p => ({ _id: p._id, name: p.name })),
    count: productIds.length
  });

  if (pass.remainingPasses <= 0) {
    pass.status = 'depleted';
  }

  await pass.save();

  // Create checkin records
  const checkins = [];
  for (const product of selectedProducts) {
    const checkin = await Checkin.create({
      customer: pass.customer,
      product: product._id,
      org: orgId,
      status: 'checked-in',
      method: 'qr-code',
      success: { status: true, reason: 'success' }
    });
    checkins.push(checkin);
  }

  return {
    checkins,
    remainingPasses: pass.remainingPasses,
    totalPasses: pass.totalPasses,
    redeemedProducts: selectedProducts,
    depleted: pass.status === 'depleted'
  };
}