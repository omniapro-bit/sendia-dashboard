# Sendia Dashboard - Security Audit Checklist

**Audit date:** 2026-03-26
**Auditor:** Automated security review (Claude)
**Scope:** sendia-dashboard (Next.js frontend) + sendia-api (Fastify backend)

---

## 1. Hardcoded Secrets Scan

| Check | Result | Notes |
|---|---|---|
| API keys (`sk_`, `whsec_`) | PASS | None found in source |
| OAuth client secrets (`GOCSPX-`, `Ev18Q`) | PASS | None found; only public `client_id` values are present (expected) |
| `client_secret` in frontend | PASS | Not present |
| `service_role` key in frontend | PASS | Not present |
| `.env` files committed | PASS | `.gitignore` excludes `.env`, `.env.local`, `.env.production` |
| Supabase anon key hardcoded | FIXED | Was hardcoded in `src/lib/supabase.ts`; moved to `NEXT_PUBLIC_SUPABASE_ANON_KEY` env var. Note: the anon key is a *public* key (role: "anon") with RLS enforcement, so this was not a secret leak, but hardcoding prevents rotation. |
| API base URL hardcoded | FIXED | Was hardcoded in `src/lib/api.ts`; now reads `NEXT_PUBLIC_API_BASE` with fallback |

## 2. Dependency Vulnerabilities

### sendia-dashboard

| Severity | Count | Details |
|---|---|---|
| Critical | 0 | -- |
| High | 0 | -- |
| Moderate | 0 | -- |
| **Total** | **0** | Clean audit |

### sendia-api

| Severity | Count | Details |
|---|---|---|
| Critical | 0 | -- |
| High | 0 | picomatch ReDoS (FIXED: updated 4.0.3 -> 4.0.4) |
| Moderate | 0 | fastify header spoofing (FIXED: updated 5.8.2 -> 5.8.4) |
| **Total** | **0** | Clean after `npm audit fix` |

## 3. Dangerous Functions

| Check | Result | Notes |
|---|---|---|
| `eval()` | PASS | Not found |
| `new Function()` | PASS | Not found |
| `dangerouslySetInnerHTML` | PASS | Not found |
| `document.write` | PASS | Not found |
| `.innerHTML =` | PASS | Not found |

## 4. Authentication Implementation

| Check | Result | Notes |
|---|---|---|
| Token storage | OK | Supabase SDK stores session in localStorage under `sendia-auth` key. This is Supabase's standard browser behavior. No manual token storage by application code. |
| Auth bypass from console | LOW RISK | Dashboard layout (`(dashboard)/layout.tsx`) uses client-side auth guard via `useAuth()` + `useEffect` redirect. This means the page HTML/JS is served before the redirect. However, all sensitive data is fetched from the API with Bearer token validation, so bypassing the UI guard yields no data. |
| Middleware auth guard | ADVISORY | `middleware.ts` is a no-op (`NextResponse.next()`). No server-side auth check exists. All protection relies on (a) client-side redirect and (b) API-level token validation. This is acceptable for an SPA pattern but means dashboard HTML skeleton is publicly accessible. |
| Session refresh | PASS | `api.ts` implements automatic session refresh on 401, with fallback to sign-out. |
| Password validation | PASS | Minimum 8 characters enforced on signup, reset, and settings change. |
| Email verification | PASS | Dashboard layout blocks unverified users with redirect to `/verify-email`. |

## 5. Sensitive Data in Client-Side Code

| Check | Result | Notes |
|---|---|---|
| `console.log` / `console.error` | PASS | Zero `console.*` statements found in source |
| Verbose error messages | PASS | Errors shown to users are generic French-language messages. API error details from `parseErrorMessage` are only used internally. |
| PII in logs | PASS | No logging of user data |
| Excessive API data | LOW RISK | `/emails` endpoint fetches up to 50-100 emails at a time. The export feature fetches 100 emails. No evidence of over-fetching beyond what is displayed. |

## 6. Security Headers (next.config.ts)

| Header | Status | Value |
|---|---|---|
| X-Frame-Options | PASS | `DENY` |
| X-Content-Type-Options | PASS | `nosniff` |
| Referrer-Policy | PASS | `strict-origin-when-cross-origin` |
| Permissions-Policy | PASS | `camera=(), microphone=(), geolocation=()` |
| Content-Security-Policy | FIXED | Removed `unsafe-eval` from `script-src`. Now: `script-src 'self' 'unsafe-inline'` |
| HSTS | MISSING | Not set. Should be handled by reverse proxy (Caddy auto-adds it). |

## 7. OAuth Configuration

| Check | Result | Notes |
|---|---|---|
| Google `client_id` in frontend | OK | Public value, expected in OAuth flow |
| Google `client_secret` | PASS | Not in frontend code |
| Microsoft `client_id` in frontend | OK | Public value, expected in OAuth flow |
| Microsoft `client_secret` | PASS | Not in frontend code |
| OAuth redirect URIs | OK | Point to `n8n.getsendia.com` webhook endpoints |

---

## Summary of Changes Made

1. **`src/lib/supabase.ts`** -- Replaced hardcoded Supabase URL and anon key with `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. **`src/lib/api.ts`** -- API base URL now reads from `process.env.NEXT_PUBLIC_API_BASE` with fallback
3. **`next.config.ts`** -- Removed `'unsafe-eval'` from CSP `script-src` directive
4. **`.env.local`** -- Created with required `NEXT_PUBLIC_*` environment variables
5. **`sendia-api`** -- Ran `npm audit fix` to patch picomatch (HIGH) and fastify (MODERATE) vulnerabilities

## Remaining Recommendations

1. **Add server-side auth middleware**: Replace the no-op middleware with Supabase server-side session validation to prevent dashboard HTML from being served to unauthenticated users.
2. **Remove `'unsafe-inline'` from CSP**: Requires migrating inline styles to CSS modules or a nonce-based approach. Low priority given no `dangerouslySetInnerHTML` usage.
3. **Enable 2FA**: The settings page shows "coming soon" for 2FA. Implement via Supabase MFA when ready.
4. **Rate limiting on auth endpoints**: Ensure the backend enforces rate limits on login/signup/password-reset to prevent brute force.
5. **Consider HttpOnly cookies for session**: Supabase PKCE flow with SSR can store tokens in HttpOnly cookies instead of localStorage, eliminating XSS token theft risk. This would require migrating to `@supabase/ssr`.
6. **Add `.env.production` to deployment**: Ensure production environment variables are injected at build time in the VPS deployment pipeline, not committed to the repo.

## Build Verification

```
npx next build -- PASS (0 errors, 0 warnings)
npm audit (dashboard) -- 0 vulnerabilities
npm audit (api) -- 0 vulnerabilities
```
