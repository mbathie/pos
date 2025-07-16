import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Accounting } from "@/models";
import mongoose from "mongoose";

// Helper to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export async function GET(req, { params }) {
  await connectDB();
  
  const { employee } = await getEmployee();
  const { id } = await params;
  
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid accounting ID" }, { status: 400 });
  }
  
  const accounting = await Accounting.findOne({
    _id: id,
    org: employee.org._id
  });
  
  if (!accounting) {
    return NextResponse.json({ error: "Accounting code not found" }, { status: 404 });
  }
  
  return NextResponse.json({ accounting }, { status: 200 });
}

export async function PUT(req, { params }) {
  await connectDB();
  
  const { employee } = await getEmployee();
  const { id } = await params;
  const body = await req.json();
  
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid accounting ID" }, { status: 400 });
  }
  
  const { name, code, description, tax } = body;
  
  if (!name || !code) {
    return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
  }
  
  try {
    const accounting = await Accounting.findOneAndUpdate(
      { _id: id, org: employee.org._id },
      { name, code, description, tax },
      { new: true, runValidators: true }
    );
    
    if (!accounting) {
      return NextResponse.json({ error: "Accounting code not found" }, { status: 404 });
    }
    
    return NextResponse.json({ accounting }, { status: 200 });
  } catch (error) {
    // Check for duplicate key error
    if (error.code === 11000) {
      return NextResponse.json({ error: "Accounting code already exists" }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await connectDB();
  
  const { employee } = await getEmployee();
  const { id } = await params;
  
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid accounting ID" }, { status: 400 });
  }
  
  const accounting = await Accounting.findOneAndDelete({
    _id: id,
    org: employee.org._id
  });
  
  if (!accounting) {
    return NextResponse.json({ error: "Accounting code not found" }, { status: 404 });
  }
  
  return NextResponse.json({ success: true, message: "Accounting code deleted successfully" }, { status: 200 });
} 