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

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate());

  const scheduleObj = schedule.toObject();
  const loc = scheduleObj.locations?.find(loc =>
    loc.location?.toString() === employee.selectedLocationId?.toString()
  );
  const filteredClasses = (loc?.classes || []).filter(cls => new Date(cls.datetime) > cutoffDate);
  const filteredSchedule = {
    ...scheduleObj,
    classes: filteredClasses,
    locations: undefined
  };

  return NextResponse.json(filteredSchedule);
}
