import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { Org } from "@/models"
import { getEmployee } from "@/lib/auth";

export async function GET() {
  await connectDB();

  const { employee } = await getEmployee();
  const org = employee.org;
  
  const fullOrg = await Org.findById(org._id);
  return NextResponse.json({ org: fullOrg }, { status: 200 });
}
export async function POST(req) {
  await connectDB();

  const data = await req.json();
  const { employee } = await getEmployee();

  // Extract only the fields we want to update
  const updateFields = {};
  const allowedFields = ['name', 'phone', 'addressLine', 'suburb', 'state', 'postcode', 'autoReceiptShop', 'membershipSuspensionDaysPerYear'];

  allowedFields.forEach(field => {
    if (data[field] !== undefined) {
      updateFields[field] = data[field];
    }
  });

  const updatedOrg = await Org.findByIdAndUpdate(
    employee.org._id,
    updateFields,
    { new: true }
  );

  return NextResponse.json({ org: updatedOrg }, { status: 200 });
}