import { type NextRequest, NextResponse } from "next/server";

/**
 * Middleware — security headers only.
 *
 * Auth is handled client-side by AuthContext (Supabase JS uses localStorage).
 * Server-side auth guard requires @supabase/ssr migration — deferred to Phase 4.
 *
 * Admin route protection: pathname /admin is not server-side guarded here because
 * reading the user's email from cookies requires @supabase/ssr (Phase 4 migration).
 * The admin page itself uses an API secret that is never exposed to the client.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://mhfuellvcjtlyehldqja.supabase.co https://api.getsendia.com; frame-ancestors 'none';"
  );
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$|api/).*)"],
};
