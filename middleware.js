import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(req) {
  const token = req.cookies.get("token")?.value;
  // console.log(token);

  try {
    // Verify the token and extract the payload
    const { payload } = await jwtVerify(token, JWT_SECRET); // Verifies the token and returns the decoded payload
    // console.log("Decoded Payload:", payload); // Here you can access the token's payload

    // Optionally, check something in the payload, e.g., the user email or id
    if (!payload?.employeeId) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next(); // Proceed if the token is valid
  } catch (err) {
    console.error("JWT Verification Failed:", err);
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/((?!api|login|signup|_next/static|_next/image|favicon.ico|$).*)"],
};