import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  // Check if user is authenticated
  let isAuthenticated = false;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      isAuthenticated = !!(payload?.employeeId);
    } catch (err) {
      // Token is invalid, user is not authenticated
      isAuthenticated = false;
    }
  }

  // Handle login/signup pages - redirect if already authenticated
  if (pathname === "/login" || pathname === "/signup") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/shop", req.url));
    }
    // Not authenticated, allow access to login/signup
    return NextResponse.next();
  }

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
    "/api/:path*",
    "/login",
    "/signup"
  ],
};