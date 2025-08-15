import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/mongoose";
import { Employee } from "@/models";

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET); // `jose` requires Uint8Array

export async function POST(req) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    const employee = await Employee.findOne({ email }).populate('org').populate('location').lean();
    // console.log(employee)

    if (!employee) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, employee.hash);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if account is locked
    if (employee.locked) {
      return NextResponse.json({ error: "Account locked" }, { status: 401 });
    }

    const token = await new SignJWT({
      selectedLocationId: employee.location._id.toString(),
      email,
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

    return NextResponse.json({ error: false, message: "Logged in" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}