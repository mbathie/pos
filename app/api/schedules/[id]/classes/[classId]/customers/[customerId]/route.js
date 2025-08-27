import mongoose from "mongoose";
import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Schedule, Checkin, Membership } from "@/models"
import { setClassAvailability } from '@/lib/schedule'

export async function PUT(req, { params }) {
  await connectDB();
  const { employee } = await getEmployee();
  const orgId = employee.org._id;
  const { id, classId, customerId } = await params;
  const { status } = await req.json();

  console.log(`Updating status for: scheduleId=${id}, classId=${classId}, customerId=${customerId}, status=${status}`);

  const scheduleId = new mongoose.Types.ObjectId(id);
  const classObjectId = new mongoose.Types.ObjectId(classId);
  const customerObjectId = new mongoose.Types.ObjectId(customerId);

  const statusMap = {'cancel': 'cancelled', 'checkin': 'checked in', 'confirmed': 'confirmed'};
  const newStatus = statusMap[status];
  
  if (!newStatus) {
    return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
  }

  // First, let's verify the schedule exists and log its structure
  const schedule = await Schedule.findOne({ _id: scheduleId, org: orgId });
  if (!schedule) {
    console.log(`Schedule not found: ${scheduleId} for org: ${orgId}`);
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  console.log(`Schedule found. Locations count: ${schedule.locations?.length || 0}`);
  
  // Find the class across all locations
  let targetClass = null;
  let targetLocationIndex = -1;
  let targetClassIndex = -1;
  
  for (let locIndex = 0; locIndex < (schedule.locations?.length || 0); locIndex++) {
    const location = schedule.locations[locIndex];
    const classIndex = location.classes?.findIndex(cls => cls._id.toString() === classId);
    if (classIndex !== -1) {
      targetClass = location.classes[classIndex];
      targetLocationIndex = locIndex;
      targetClassIndex = classIndex;
      break;
    }
  }
  
  if (!targetClass) {
    console.log(`Class not found: ${classId}`);
    const allClasses = schedule.locations?.flatMap(loc => loc.classes?.map(c => c._id.toString()) || []) || [];
    console.log(`Available classes:`, allClasses);
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  console.log(`Class found. Customers count: ${targetClass.customers?.length || 0}`);
  
  // Find the specific customer
  const targetCustomer = targetClass.customers?.find(cust => cust._id.toString() === customerId);
  if (!targetCustomer) {
    console.log(`Customer not found: ${customerId}`);
    console.log(`Available customers:`, targetClass.customers?.map(c => c._id.toString()));
    return NextResponse.json({ error: "Customer not found in this class" }, { status: 404 });
  }

  console.log(`Customer found. Current status: ${targetCustomer.status}, updating to: ${newStatus}`);

  const result = await Schedule.updateOne(
    {
      _id: scheduleId,
      org: orgId,
      "locations.classes._id": classObjectId,
      "locations.classes.customers._id": customerObjectId
    },
    {
      $set: {
        "locations.$[locElem].classes.$[classElem].customers.$[custElem].status": newStatus
      }
    },
    {
      arrayFilters: [
        { "locElem.classes._id": classObjectId },
        { "classElem._id": classObjectId },
        { "custElem._id": customerObjectId }
      ]
    }
  );

  console.log(`Update result:`, result);

  if (result.modifiedCount === 0) {
    return NextResponse.json({ error: "Update failed - no documents modified" }, { status: 404 });
  }

  // Create Checkins record when checking in (just like QR code does)
  if (newStatus === 'checked in') {
    console.log('Creating Checkins record for manual check-in');
    
    // Get the schedule with populated product to get product ID
    const fullSchedule = await Schedule.findById(scheduleId).populate('product');
    
    // Check for recent duplicate check-in (within last 10 seconds) to prevent double-clicks
    const now = new Date();
    const tenSecondsAgo = new Date(now.getTime() - 10 * 1000);
    const recentClassCheckin = await Checkin.findOne({
      customer: targetCustomer.customer,
      product: fullSchedule.product._id,
      schedule: scheduleId,
      createdAt: { $gte: tenSecondsAgo }
    });
    
    if (recentClassCheckin) {
      console.log('Duplicate class check-in detected within 10 seconds, skipping');
    } else {
      // Create a CLASS check-in record
      const classCheckinRecord = new Checkin({
        customer: targetCustomer.customer,
        product: fullSchedule.product._id,
        schedule: scheduleId,
        class: {
          datetime: targetClass.datetime,
          location: schedule.locations[targetLocationIndex].location
        },
        status: 'checked-in',
        method: 'manual', // Different method to distinguish from QR code
        org: orgId
      });
      
      await classCheckinRecord.save();
      console.log('Class check-in record created:', classCheckinRecord._id);
    }
    
    // Also check for active membership and create SEPARATE record (like QR does)
    const activeMembership = await Membership.findOne({
      customer: targetCustomer.customer,
      org: orgId,
      status: 'active'
    }).populate('product');
    
    if (activeMembership) {
      console.log('Active membership found:', activeMembership.product?.name);
      
      // Check for recent duplicate membership check-in (within last 10 seconds)
      const recentMembershipCheckin = await Checkin.findOne({
        customer: targetCustomer.customer,
        product: activeMembership.product._id,
        createdAt: { $gte: tenSecondsAgo }
      });
      
      if (recentMembershipCheckin) {
        console.log('Duplicate membership check-in detected within 10 seconds, skipping');
      } else {
        // Create a SEPARATE membership check-in record
        const membershipCheckinRecord = new Checkin({
          customer: targetCustomer.customer,
          product: activeMembership.product._id,
          // Don't include schedule - this is a membership-only check-in
          class: {
            datetime: now, // Use CURRENT time for membership check-in
            location: schedule.locations[targetLocationIndex].location
          },
          status: 'checked-in',
          method: 'manual',
          org: orgId
        });
        
        await membershipCheckinRecord.save();
        console.log('Membership check-in record created:', membershipCheckinRecord._id);
      }
    }
  }

  await setClassAvailability({scheduleId, classObjectId, orgId});



  const updatedSchedule = await Schedule.findOne({ _id: scheduleId, org: orgId })
    .populate("product")
    .populate("locations.location")
    .populate({
      path: "locations.classes.customers.customer",
      model: "Customer",
      select: "name email phone memberId dependents"
    });

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate());

  // Transform to match the same structure as GET /api/schedules/[id]
  const scheduleObj = updatedSchedule.toObject();
  console.log('Available locations:', scheduleObj.locations?.map(l => ({ 
    id: l.location?._id?.toString() || l.location?.toString(), 
    classCount: l.classes?.length 
  })));
  console.log('Employee selected location:', employee.selectedLocationId?.toString());
  
  const loc = scheduleObj.locations?.find(loc => {
    const locationId = loc.location?._id?.toString() || loc.location?.toString();
    return locationId === employee.selectedLocationId?.toString();
  });
  console.log('Found location:', loc ? 'Yes' : 'No');
  console.log('Classes in location before filtering:', loc?.classes?.length || 0);
  
  let filteredClasses = (loc?.classes || []).filter(cls => {
    const classDate = new Date(cls.datetime);
    const isAfterCutoff = classDate > cutoffDate;
    console.log(`Class ${cls._id}: ${cls.datetime} -> After cutoff (${cutoffDate.toISOString()}): ${isAfterCutoff}`);
    return isAfterCutoff;
  });
  console.log('Classes after filtering:', filteredClasses.length);
  
  // Process classes to extract dependent details (same as GET endpoint)
  filteredClasses = filteredClasses.map(cls => ({
    ...cls,
    customers: cls.customers?.map(cust => {
      // If there's a dependent ID, find the dependent in the customer's dependents array
      if (cust.dependent && cust.customer?.dependents) {
        const dependentDetails = cust.customer.dependents.find(
          dep => dep._id?.toString() === cust.dependent.toString()
        );
        return {
          ...cust,
          dependent: dependentDetails || { _id: cust.dependent }
        };
      }
      return cust;
    }) || []
  }));
  
  const filteredSchedule = {
    ...scheduleObj,
    classes: filteredClasses,
    locations: undefined
  };

  return NextResponse.json(filteredSchedule);
}
