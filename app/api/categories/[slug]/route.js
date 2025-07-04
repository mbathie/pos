import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Category } from "@/models";



export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const org = employee.org;

  const { slug } = await params;

  const body = await req.json();
  const { menu } = body;

  const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(slug);

  const query = isValidObjectId
    ? { _id: slug, org }
    : { name: slug, org };

  const update = isValidObjectId ? {} : { name: slug, org: employee.orgId, ...(menu && { menu }) };

  const category = await Category.findOneAndUpdate(
    query,
    update,
    { new: true, upsert: !isValidObjectId }
  );

  return NextResponse.json({ category }, { status: 201 });
}

export async function GET(req, { params }) {
  await connectDB();
  const { employee } = await getEmployee();
  const org = employee.org;

  const { slug: name } = await params;

  if (!name) {
    return NextResponse.json({ error: "Missing category name" }, { status: 400 });
  }

  const category = await Category.findOne({ name, org: org._id });

  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  return NextResponse.json({ category });
}