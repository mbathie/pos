import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { Folder } from "@/models";

export async function PUT(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const { name, color } = await req.json();
  const { id } = await params;

  const folder = await Folder.findOneAndUpdate(
    { _id: id, org: employee.org._id },
    { name, color },
    { new: true }
  );

  console.log(folder)

  if (!folder) {
    return NextResponse.json({ error: 'Folder not found or unauthorized' }, { status: 404 });
  }

  return NextResponse.json({ folder }, { status: 200 });
}

export async function DELETE(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const { id } = await params;

  const folder = await Folder.findOneAndDelete(
    { _id: id, org: employee.org._id }
  );

  if (!folder) {
    return NextResponse.json({ error: 'Folder not found or unauthorized' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Folder deleted successfully' }, { status: 200 });
}