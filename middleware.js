import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(req) {
  // Only run auth check for protected API routes
  const { pathname } = req.nextUrl;

  // Allow all /api/auth/* and /api/unauth/* routes through
  if (
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/unauth/") ||
    pathname === "/api/unauth"
  ) {
    return NextResponse.next();
  }

  // Only protect /api routes
  if (pathname.startsWith("/api/")) {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (!payload?.employeeId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.next();
    } catch (err) {
      console.error("JWT Verification Failed:", err);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // For all other routes, do nothing (let them through)
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*"
  ],
};