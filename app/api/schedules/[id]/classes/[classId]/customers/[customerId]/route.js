import mongoose from "mongoose";
import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Schedule } from "@/models"
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

  const statusMap = {'cancel': 'cancelled', 'checkin': 'checked in'};
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

  await setClassAvailability({scheduleId, classObjectId, orgId});



  const updatedSchedule = await Schedule.findOne({ _id: scheduleId, org: orgId })
    .populate("product")
    .populate("locations.location")
    .populate({
      path: "locations.classes.customers.customer",
      model: "Customer",
      select: "name email phone memberId"
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
  
  const filteredClasses = (loc?.classes || []).filter(cls => {
    const classDate = new Date(cls.datetime);
    const isAfterCutoff = classDate > cutoffDate;
    console.log(`Class ${cls._id}: ${cls.datetime} -> After cutoff (${cutoffDate.toISOString()}): ${isAfterCutoff}`);
    return isAfterCutoff;
  });
  console.log('Classes after filtering:', filteredClasses.length);
  
  const filteredSchedule = {
    ...scheduleObj,
    classes: filteredClasses,
    locations: undefined
  };

  return NextResponse.json(filteredSchedule);
}
