# Sendia Dashboard + API -- Security Audit

**Date:** 2026-03-25
**Scope:** Authentication, session management, API security, transport security
**Files audited:**
- `sendia-dashboard/src/contexts/AuthContext.tsx`
- `sendia-dashboard/src/middleware.ts`
- `sendia-dashboard/src/lib/supabase.ts`
- `sendia-dashboard/src/lib/api.ts`
- `sendia-dashboard/src/app/(auth)/signup/page.tsx`
- `sendia-dashboard/next.config.ts`
- `sendia-api/src/lib/supabase-auth.ts`
- `sendia-api/src/index.ts`
- `sendia-api/src/config.ts`
- `sendia-api/src/routes/client-api.ts`

---

## CRITICAL -- Must Fix Now

### C1. JWT signature verification is disabled (backend)

**File:** `sendia-api/src/lib/supabase-auth.ts`, lines 22-25
**Description:** The `verifySupabaseJwt` function skips cryptographic signature verification entirely. The comment says "Supabase migrated to ECC P-256 keys" but the function still imports `createHmac` (unused). This means **any attacker can forge a valid JWT** by crafting a token with a valid-looking `sub`, `iss` containing "supabase", and a future `exp`. The issuer check on line 38 only verifies the string *contains* "supabase" -- a token with `iss: "not-supabase-lol"` would pass.

**Impact:** Complete authentication bypass. An attacker can impersonate any user by crafting a fake JWT with an arbitrary `sub` claim. This gives full access to any client's profile, emails, stats, and the ability to modify their data or ingest documents.

**Fix:**
1. Use the `SUPABASE_JWT_SECRET` (already in `config.ts`) to verify the HMAC-SHA256 signature. Supabase project JWTs use HS256 by default (not ECC P-256) -- verify this in your Supabase dashboard under Settings > API.
2. Alternatively, use `@supabase/supabase-js` server-side with `supabase.auth.getUser(token)` which makes an API call to Supabase to validate the token.
3. The issuer check must use strict equality: `payload.iss !== "https://mhfuellvcjtlyehldqja.supabase.co/auth/v1"`.

```typescript
import { createHmac, timingSafeEqual } from "node:crypto";

function verifySupabaseJwt(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  // Verify HMAC-SHA256 signature
  const expectedSig = createHmac("sha256", config.SUPABASE_JWT_SECRET)
    .update(headerB64 + "." + payloadB64)
    .digest();
  const actualSig = Buffer.from(signatureB64, "base64url");
  if (actualSig.length !== expectedSig.length ||
      !timingSafeEqual(expectedSig, actualSig)) return null;

  // ... rest of validation (expiry, issuer, sub)
}
```

---

### C2. API secret compared with `===` (timing attack)

**File:** `sendia-api/src/index.ts`, line 74; `sendia-api/src/lib/supabase-auth.ts`, line 97
**Description:** The API secret is compared using JavaScript strict equality (`===`), which is vulnerable to timing attacks. An attacker can measure response times to progressively guess the secret character by character.

**Impact:** With enough requests, an attacker could recover the `API_SECRET` value, which grants full access to all internal API routes (n8n-level access to all client data, email pipelines, WhatsApp pipelines).

**Fix:** Use `crypto.timingSafeEqual` for all secret comparisons:

```typescript
import { timingSafeEqual } from "node:crypto";

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

---

## HIGH -- Fix Before Launch

### H1. No email verification enforcement

**Files:** `sendia-dashboard/src/contexts/AuthContext.tsx`, `sendia-api/src/lib/supabase-auth.ts`
**Description:** After signup, the toast says "Verifiez votre email" but nothing prevents an unverified user from logging in and accessing the dashboard. The backend JWT validation does not check `email_confirmed_at` in the token payload. Supabase includes this field in the JWT -- it should be checked.

**Impact:** Attackers can sign up with fake email addresses and access the dashboard. This weakens account recovery, enables spam accounts, and makes user attribution unreliable.

**Fix:**
1. In Supabase dashboard: enable "Confirm email" under Authentication > Settings.
2. In `verifySupabaseJwt`: reject tokens where `email_confirmed_at` is null/missing.
3. In the dashboard: add a check in `AuthContext` or middleware to redirect unverified users to a verification prompt page.

---

### H2. Dashboard middleware does nothing

**File:** `sendia-dashboard/src/middleware.ts`, lines 1-9
**Description:** The Next.js middleware matches all routes but simply returns `NextResponse.next()` without any authentication check. All route protection relies entirely on client-side checks (the `useAuth` hook in React components). This means server-rendered pages and API route handlers have zero server-side auth protection.

**Impact:** An attacker who navigates directly to a protected page URL can see the page shell/layout before client-side JS kicks in and redirects. More critically, any Next.js API routes or Server Components that assume middleware enforces auth are unprotected.

**Fix:** Implement proper server-side auth checking in middleware using `@supabase/ssr`:

```typescript
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: { /* cookie adapter for request/response */ },
  });
  const { data: { session } } = await supabase.auth.getSession();

  const isAuthPage = request.nextUrl.pathname.startsWith("/login")
    || request.nextUrl.pathname.startsWith("/signup")
    || request.nextUrl.pathname.startsWith("/reset-password");

  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}
```

---

### H3. No security headers (dashboard or API)

**Files:** `sendia-dashboard/next.config.ts`, `sendia-api/src/index.ts`
**Description:** Neither the Next.js app nor the Fastify API sets any security headers:
- No `Content-Security-Policy` (CSP)
- No `Strict-Transport-Security` (HSTS)
- No `X-Content-Type-Options`
- No `X-Frame-Options`
- No `Referrer-Policy`
- No `Permissions-Policy`

**Impact:** The dashboard is vulnerable to clickjacking (no X-Frame-Options), MIME-type sniffing attacks, and lacks HSTS which means first-visit users could be intercepted via HTTP downgrade.

**Fix for dashboard** (`next.config.ts`):
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://mhfuellvcjtlyehldqja.supabase.co https://api.getsendia.com;" },
      ],
    }];
  },
};
```

**Fix for API:** Install and register `@fastify/helmet`.

---

### H4. Supabase credentials hardcoded in client-side code

**File:** `sendia-dashboard/src/lib/supabase.ts`, lines 3-5
**Description:** The Supabase URL and anon key are hardcoded directly in the source file rather than loaded from environment variables. While the anon key is designed to be public (it is scoped by Row Level Security), hardcoding makes key rotation difficult and the URL reveals the project ID.

**Impact:** If the anon key ever needs rotation (e.g., after a security incident), every deployed build must be rebuilt. This also prevents different keys for staging vs. production environments.

**Fix:** Use environment variables:
```typescript
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
```

---

### H5. Weak password policy

**File:** `sendia-dashboard/src/app/(auth)/signup/page.tsx`, line 20
**Description:** The only password requirement is minimum 8 characters. No checks for:
- Uppercase/lowercase mix
- Numbers or special characters
- Common/breached password lists
- Maximum length (to prevent DoS via bcrypt)

This is client-side only -- there is no server-side enforcement beyond Supabase defaults (which also only require 6 characters).

**Impact:** Users can set trivially guessable passwords like "password" or "12345678", making brute-force attacks viable.

**Fix:**
1. Enforce at minimum: 8 chars, 1 uppercase, 1 lowercase, 1 digit.
2. Configure Supabase Auth to enforce the same minimum (Settings > Auth > Password requirements).
3. Consider integrating a breached-password check (e.g., HaveIBeenPwned k-anonymity API).

---

### H6. localStorage session storage vulnerable to XSS

**File:** `sendia-dashboard/src/lib/supabase.ts`, line 9
**Description:** The Supabase client stores auth tokens in `localStorage` (via `storageKey: "sendia-auth"`). Unlike `httpOnly` cookies, `localStorage` is accessible to any JavaScript running on the page, including injected scripts from XSS vulnerabilities.

**Impact:** If any XSS vulnerability exists (or is introduced), an attacker can steal the full session token including the refresh token, gaining persistent access to the victim's account.

**Fix:** Migrate to cookie-based session storage using `@supabase/ssr`:
```typescript
import { createBrowserClient } from "@supabase/ssr";
export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```
This stores tokens in `httpOnly` cookies that JavaScript cannot access.

---

## MEDIUM -- Fix Soon

### M1. No client-side rate limiting on auth actions

**File:** `sendia-dashboard/src/contexts/AuthContext.tsx`
**Description:** The `signIn`, `signUp`, and `sendPasswordReset` functions have no rate limiting or debouncing. While Supabase has built-in rate limits, they are generous (default: ~30 requests/10s). The backend has global rate limiting (100 req/min), but the Supabase auth endpoints are hit directly from the client, bypassing backend rate limits.

**Impact:** Brute-force attacks against user passwords are limited only by Supabase default rate limits. The password reset endpoint could be abused to spam a target's email inbox.

**Fix:**
1. Add client-side rate limiting (e.g., disable the login button for 2 seconds after a failed attempt, exponential backoff after 5 failures).
2. Configure stricter rate limits in Supabase dashboard (Auth > Rate Limits).
3. Consider adding CAPTCHA after N failed login attempts.

---

### M2. Open redirect potential in password reset

**File:** `sendia-dashboard/src/contexts/AuthContext.tsx`, line 77
**Description:** The `redirectTo` parameter in `resetPasswordForEmail` uses `window.location.origin`, which is correct in normal usage. However, Supabase must be configured to validate this against an allow-list of redirect URLs. If not configured, an attacker could manipulate the redirect flow.

**Impact:** If the Supabase redirect allow-list is not properly configured, an attacker could craft a password reset link that redirects to a malicious site after the user clicks the email link.

**Fix:** In Supabase dashboard, go to Authentication > URL Configuration and ensure:
- Site URL is set to `https://app.getsendia.com`
- Redirect URLs allow-list includes only `https://app.getsendia.com/reset-password`

---

### M3. CORS allows localhost in production

**File:** `sendia-api/src/index.ts`, line 47
**Description:** The CORS configuration includes a regex matching any localhost origin (including plain HTTP). This regex is present regardless of `NODE_ENV`.

**Impact:** In production, if an attacker can trick a user into visiting a malicious page served from localhost (e.g., via a local dev server exploit), they could make cross-origin requests to the API with the user's credentials.

**Fix:** Conditionally include localhost only in development:
```typescript
const origins: (string | RegExp)[] = [
  "https://n8n.getsendia.com",
  "https://api.getsendia.com",
  "https://getsendia.com",
  "https://www.getsendia.com",
  "https://app.getsendia.com",
];
if (config.NODE_ENV !== "production") {
  origins.push(/^https?:\/\/localhost(:\d+)?$/);
}
```

---

### M4. Tmp file endpoint uses truncated HMAC signature

**File:** `sendia-api/src/index.ts`, line 147
**Description:** The HMAC signature for temporary file URLs is truncated to 16 hex characters (64 bits) via `.slice(0, 16)`. While this still provides reasonable protection for short-lived files, it significantly reduces the brute-force resistance compared to the full 256-bit HMAC.

**Impact:** A 64-bit signature space is brute-forceable with significant compute resources, though the expiration check provides a time-bound mitigation.

**Fix:** Use at least 32 hex characters (128 bits) or the full digest.

---

### M5. API secret accepted via query parameter

**Files:** `sendia-api/src/index.ts`, lines 61-64; `sendia-api/src/lib/supabase-auth.ts`, lines 61-64
**Description:** The API secret can be passed as `?key=` query parameter. Query parameters are logged in web server access logs, browser history, referrer headers, and proxy logs.

**Impact:** The API secret could be leaked through server logs, monitoring tools, or CDN/proxy access logs.

**Fix:** Accept the API secret exclusively via the `x-api-secret` header. If the query parameter is needed for webhook compatibility, add a deprecation warning and plan to remove it.

---

### M6. preSerialization hook may leak internal request data

**File:** `sendia-api/src/index.ts`, lines 107-123
**Description:** The preSerialization hook merges request body fields into the response for n8n compatibility. While `STRIP_KEYS` excludes known sensitive fields, any new sensitive field added to request bodies in the future could accidentally be included in responses. This is a maintenance risk that requires keeping an explicit deny-list in sync.

**Impact:** Internal data from request bodies could unintentionally be exposed to clients if `STRIP_KEYS` is not kept up to date with new fields.

**Fix:** Switch to an allow-list approach instead of a deny-list, or scope this hook to only apply to n8n-facing routes (those authenticated with API secret, not JWT).

---

## Summary

| Severity | Count | Key Issues |
|----------|-------|------------|
| CRITICAL | 2     | JWT forgery (C1), API secret timing attack (C2) |
| HIGH     | 6     | No email verification (H1), empty middleware (H2), no security headers (H3), hardcoded creds (H4), weak passwords (H5), localStorage tokens (H6) |
| MEDIUM   | 6     | No auth rate limiting (M1), open redirect risk (M2), CORS localhost (M3), truncated HMAC (M4), secret in query param (M5), response data leakage (M6) |

**Top priority:** Fix C1 (JWT signature bypass) immediately -- this is a complete authentication bypass that allows any attacker to impersonate any user. The `SUPABASE_JWT_SECRET` is already available in `config.ts` but is never used.

---

*Audit performed by security-engineer agent on 2026-03-25.*
