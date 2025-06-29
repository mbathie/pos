import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongoose"
import { Org } from "@/models"

export async function GET(req, { params }) {
  await connectDB()

  const { id } = await params

  const org = await Org.findById(id);
  if (!org) {
    return NextResponse.json({ error: "Org not found" }, { status: 404 });
  }

  return NextResponse.json({ org }, { status: 200 });
}
