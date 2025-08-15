import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongoose";
import { getEmployee } from "@/lib/auth"

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET)

export async function POST(req) {
  try {
    await connectDB();
    const { locationId } = await req.json();
    const { employee } = await getEmployee()

    if (!employee)
      return NextResponse.json({ error: "Invalid" }, { status: 401 })

    const token = await new SignJWT({
      selectedLocationId: locationId,
      email: employee.email,
      employeeId: employee._id.toString(),
      orgId: employee.org._id.toString(),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1y")
      .sign(SECRET_KEY);

    const cookieStore = await cookies();

    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return NextResponse.json({ error: false, message: "Location set" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}