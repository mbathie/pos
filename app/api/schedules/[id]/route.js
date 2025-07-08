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
    .populate("location")
    .populate({
      path: "classes.customers.customer",
      model: "Customer"
    });

  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate());

  const filteredClasses = schedule.classes?.filter(cls => new Date(cls.datetime) > cutoffDate) || [];
  const filteredSchedule = {
    ...schedule.toObject(),
    classes: filteredClasses
  };

  return NextResponse.json(filteredSchedule);
}
