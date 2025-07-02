import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { Folder } from "@/models";

export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();

  const { name, color } = await req.json();

  const folder = await Folder.create({
    name, color, org: employee.org._id,
  });

  console.log(folder)

  return NextResponse.json({ folder }, { status: 200 });
}

export async function GET(req) {
  await connectDB()

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")

  const { employee } = await getEmployee()

  if (!search)
    return NextResponse.json({ error: "Missing search parameter" }, { status: 400 })

  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape special chars
  const regex = new RegExp(escaped, "i") // case-insensitive
  const folders = await Folder.find({
    org: employee.org._id,
    $or: [
      { name: { $regex: regex } }
    ]
  })

  console.log(folders)

  return NextResponse.json(folders)
}
