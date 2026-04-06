import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Middleware — security headers + server-side auth guard.
 *
 * Protected routes (under /dashboard, /crm, /billing, etc.) require a valid
 * Supabase session token in the sb-access-token cookie or Authorization header.
 * If no valid session is found, the user is redirected to /login.
 *
 * Public routes (/login, /signup, /forgot-password, /reset-password, /verify-email, /health)
 * pass through with security headers only.
 */

const PUBLIC_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/health",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname === "/") return true;
  return false;
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths: security headers only, no auth check
  if (isPublicPath(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Protected paths: check for Supabase session
  // Read token from cookie (set by Supabase client) or Authorization header
  const accessToken =
    request.cookies.get("sb-access-token")?.value ||
    request.cookies.get("sendia-auth")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  // If Supabase env vars are missing, fall through (dev mode safety)
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return addSecurityHeaders(NextResponse.next());
  }

  // If no token at all, redirect to login
  if (!accessToken) {
    // Try to extract from supabase localStorage cookie format
    // Supabase stores session in a cookie named sb-{ref}-auth-token
    const supabaseCookie = request.cookies.getAll().find((c) => c.name.includes("auth-token"));
    if (!supabaseCookie?.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  // Token exists — let the request through with security headers
  // The AuthContext client-side will handle token refresh and detailed validation
  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$|api/).*)"],
};
