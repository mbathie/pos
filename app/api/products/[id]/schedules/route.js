import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { getEmployee } from "@/lib/auth";
import { Schedule } from "@/models"
import mongoose from "mongoose"

export async function GET(req, { params }) {
  await connectDB();
  const { employee } = await getEmployee();
  console.log(employee)
  const { id } = await params

  const schedule = await Schedule.findOne({
    org: employee.org._id,
    product: new mongoose.Types.ObjectId(id)
  });

  if (!schedule) {
    return NextResponse.json({ classes: [] }, { status: 200 });
  }

  const locationEntry = schedule.locations?.find(loc =>
    loc.location?.toString() === employee.selectedLocationId.toString()
  );

  return NextResponse.json({ classes: locationEntry?.classes ?? [] }, { status: 200 });
}
