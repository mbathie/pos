import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth"
import { Schedule } from "@/models"

export async function GET(req) {
  await connectDB()
  const { employee } = await getEmployee()
  const orgId = employee.org._id

  const schedulesRaw = await Schedule.find({ org: orgId })
    .populate("product")
    // .populate("location")
    .sort({ start: -1 })

  const schedules = schedulesRaw.map(sch => {
    const scheduleObj = sch.toObject();
    const loc = scheduleObj.locations?.find(loc =>
      loc.location?.toString() === employee.selectedLocationId?.toString()
    );
    return {
      ...scheduleObj,
      classes: loc?.classes || [],
      locations: undefined
    };
  });

  return NextResponse.json(schedules);
}
