import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import prisma from "@/lib/db";
import bcrypt from "bcrypt";
import { cookies } from "next/headers"

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET); // `jose` requires Uint8Array

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    const employee = await prisma.employee.findUnique({
      where: { email },
      // include: { hash: true, id: true, email: true  }
    });

    console.log(employee)
    if (!employee) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, employee.hash);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // ✅ Generate JWT using `jose`
    const token = await new SignJWT({ email, employeeId: employee.id, orgId: employee.OrgId }) // Payload (you can add more fields)
      .setProtectedHeader({ alg: "HS256" }) // Algorithm
      .setExpirationTime("1y") // Token expiry
      .sign(SECRET_KEY); // Secret key

    // ✅ Get cookie store and await its promise
    const cookieStore = await cookies(); // Ensure you await cookies() as it is an async function

    // ✅ Set HTTP-only cookie using `next/headers`
    cookieStore.set("token", token, { 
      // httpOnly: true, // Cookie is HTTP-only
      // secure: process.env.NODE_ENV === "production", // Set to true in production
      // path: "/",
      // // sameSite: "Strict", // You can adjust the SameSite attribute based on your needs
    });

    return NextResponse.json({ error: false, message: "Logged in" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}