import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth";
import { Category } from "@/models";

export async function GET(req) {
  await connectDB();

  const { employee } = await getEmployee();
  const org = employee.org;

  const { searchParams } = new URL(req.url);
  const menu = searchParams.get("menu");

  const query = { org: employee.orgId };
  if (menu) {
    query.menu = menu;
  }

  const categories = await Category.find(query);

  return NextResponse.json({ categories }, { status: 200 });
}