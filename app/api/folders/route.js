import { NextResponse } from "next/server";
import { getEmployee } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { Folder } from "@/models";

export async function POST(req, { params }) {
  await connectDB();

  const { employee } = await getEmployee();

  const { name, color, category } = await req.json();

  const folder = await Folder.create({
    name, 
    color, 
    category,
    org: employee.org._id,
  });

  return NextResponse.json({ folder }, { status: 200 });
}

export async function GET(req) {
  await connectDB()

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const categoryId = searchParams.get("category")

  const { employee } = await getEmployee()

  // Build query
  let query = { org: employee.org._id }
  
  // Add category filter if provided
  if (categoryId) {
    query.category = categoryId
  }

  // If no search parameter or empty string, return filtered folders
  if (!search || search === '') {
    const folders = await Folder.find(query).sort({ name: 1 }) // Sort alphabetically
    return NextResponse.json(folders)
  }

  // Otherwise, search for folders with filters
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // escape special chars
  const regex = new RegExp(escaped, "i") // case-insensitive
  query.$or = [{ name: { $regex: regex } }]
  
  const folders = await Folder.find(query).sort({ name: 1 })

  return NextResponse.json(folders)
}
