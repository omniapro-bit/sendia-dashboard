import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
  const token = request.cookies.get("sb-mhfuellvcjtlyehldqja-auth-token")?.value
    ?? request.cookies.get("sendia-auth")?.value;
  if (!isPublic && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isPublic && token && pathname !== "/reset-password") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
