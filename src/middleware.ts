import { type NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/connect"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for public paths, static assets, and API routes
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname === "/") {
    return NextResponse.next();
  }

  // Check for Supabase auth cookie (sb-<ref>-auth-token)
  const hasAuthCookie = request.cookies.getAll().some(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );

  if (!hasAuthCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)"],
};
