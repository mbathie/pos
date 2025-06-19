import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { Folder } from "@/models";

export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();
  const org = employee.org;

  const body = await req.json();
  const folderName = body.name;
  const folderColor = body.colour;

  const folder = await Folder.create({
    name: folderName,
    color: folderColor,
    org: employee.orgId,
  });

  return NextResponse.json({ folder }, { status: 200 });
}

export async function GET(req) {
  await connectDB()

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")

  const { employee } = await getEmployee()
  const orgId = employee.org._id

  if (!search)
    return NextResponse.json({ error: "Missing search parameter" }, { status: 400 })

  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape special chars
  const regex = new RegExp(escaped, "i") // case-insensitive
  const folders = await Folder.find({
    org: orgId,
    $or: [
      { name: { $regex: regex } }
    ]
  })

  return NextResponse.json(folders)
}
