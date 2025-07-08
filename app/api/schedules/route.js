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
    .populate("location")
    .sort({ start: -1 });

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate());

  const schedules = schedulesRaw
    .map(sch => {
      const filteredClasses = sch.classes?.filter(cls => new Date(cls.datetime) > cutoffDate) || [];
      return {
        ...sch.toObject(),
        classes: filteredClasses
      };
    })
    .filter(sch => sch.classes.length > 0);

  return NextResponse.json(schedules)
}
