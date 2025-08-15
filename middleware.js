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

  // Allow employee setup pages without authentication
  if (pathname.startsWith("/employee/")) {
    return NextResponse.next();
  }

  // Allow customer pages without employee authentication (they may have their own auth)
  if (pathname.startsWith("/c/")) {
    return NextResponse.next();
  }

  // Allow all /api/auth/*, /api/unauth/*, and /api/c/* routes through (customer endpoints)
  if (
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/unauth/") ||
    pathname === "/api/unauth" ||
    pathname.startsWith("/api/c/") ||
    pathname === "/api/c"
  ) {
    // Add CORS headers for customer API endpoints
    if (pathname.startsWith("/api/c/")) {
      const response = NextResponse.next();
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return response;
    }
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
    "/signup",
    "/employee/:path*",
    "/c/:path*"
  ],
};