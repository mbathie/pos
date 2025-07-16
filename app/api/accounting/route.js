import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Accounting } from "@/models";

export async function GET(req) {
  await connectDB();

  const { employee } = await getEmployee();

  const query = { 
    org: employee.org._id
  };

  const accounting = await Accounting.find(query);

  return NextResponse.json({ accounting }, { status: 200 });
}

export async function POST(req) {
  await connectDB();
  
  const { employee } = await getEmployee();
  const body = await req.json();
  
  const { name, code, description, tax } = body;
  
  if (!name || !code) {
    return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
  }
  
  try {
    const accounting = new Accounting({
      name,
      code,
      description,
      tax,
      org: employee.org._id
    });
    
    await accounting.save();
    
    return NextResponse.json({ accounting }, { status: 201 });
  } catch (error) {
    // Check for duplicate key error
    if (error.code === 11000) {
      return NextResponse.json({ error: "Accounting code already exists" }, { status: 400 });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 