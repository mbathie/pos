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

  // console.log(`id=${id} classId=${classId} customerId=${customerId}`)

  const scheduleId = new mongoose.Types.ObjectId(id);
  const classObjectId = new mongoose.Types.ObjectId(classId);
  const customerObjectId = new mongoose.Types.ObjectId(customerId);

  const statusMap = {'cancel': 'cancelled', 'checkin': 'checked in'}

  const result = await Schedule.updateOne(
    {
      _id: scheduleId,
      org: orgId,
      "classes._id": classObjectId,
      "classes.customers._id": customerObjectId
    },
    {
      $set: {
        "classes.$[classElem].customers.$[custElem].status": statusMap[status]
      }
    },
    {
      arrayFilters: [
        { "classElem._id": classObjectId },
        { "custElem._id": customerObjectId }
      ]
    }
  );

  if (result.modifiedCount === 0) {
    return NextResponse.json({ error: "Schedule/class/customer not found or unchanged" }, { status: 404 });
  }

  await setClassAvailability({scheduleId, classObjectId, orgId});



  const updatedSchedule = await Schedule.findOne({ _id: scheduleId, org: orgId })
    .populate("product")
    .populate("location")
    .populate({
      path: "classes.customers.customer",
      model: "Customer"
    });

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate());

  const filteredClasses = updatedSchedule.classes?.filter(cls => new Date(cls.datetime) > cutoffDate) || [];
  const filteredSchedule = {
    ...updatedSchedule.toObject(),
    classes: filteredClasses
  };

  return NextResponse.json(filteredSchedule);
}
