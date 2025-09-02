import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;
  
  console.log('[Middleware] Processing path:', pathname);
  console.log('[Middleware] Has token:', !!token);

  // Check if user is authenticated
  let isAuthenticated = false;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      isAuthenticated = !!(payload?.employeeId);
      console.log('[Middleware] Token valid, employeeId:', payload?.employeeId);
    } catch (err) {
      // Token is invalid, user is not authenticated
      console.log('[Middleware] Token invalid:', err.message);
      isAuthenticated = false;
    }
  }

  // Handle login/signup pages - redirect if already authenticated
  if (pathname === "/login" || pathname === "/signup") {
    console.log(`isAuthenticated: ${isAuthenticated}`);
    if (isAuthenticated) {
      console.log('[Middleware] User authenticated on login/signup page, redirecting to /shop');
      return NextResponse.redirect(new URL("/shop", req.url));
    }
    // Not authenticated, allow access to login/signup
    console.log('[Middleware] User not authenticated, allowing access to:', pathname);
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

  // Allow all /api/auth/*, /api/unauth/*, /api/public/*, and /api/c/* routes through
  if (
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/unauth/") ||
    pathname === "/api/unauth" ||
    pathname.startsWith("/api/public/") ||
    pathname === "/api/public" ||
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

  // For all other matched routes that aren't API routes, just let them through
  // The layout.js will handle authentication and permission checks for app routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};