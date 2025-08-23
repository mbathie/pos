import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Schedule } from "@/models"

export async function GET(req, { params }) {
  await connectDB();
  const { employee } = await getEmployee();
  const orgId = employee.org._id;
  const { id } = await params;

  const schedule = await Schedule.findOne({ _id: id, org: orgId })
    .populate("product")
    .populate({
      path: "locations.classes.customers.customer",
      select: "name email phone memberId"
    })

  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const scheduleObj = schedule.toObject();
  const loc = scheduleObj.locations?.find(loc =>
    loc.location?.toString() === employee.selectedLocationId?.toString()
  );
  
  // Get all classes for this location, sorted by datetime
  const allClasses = (loc?.classes || []).sort((a, b) => 
    new Date(a.datetime) - new Date(b.datetime)
  );
  const filteredSchedule = {
    ...scheduleObj,
    classes: allClasses,
    locations: undefined
  };

  return NextResponse.json(filteredSchedule);
}
