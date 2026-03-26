import { supabase } from "./supabase";
import type {
  ClientProfile,
  ClientStats,
  EmailsResponse,
  ProfileUpdateBody,
  BillingStatus,
  BillingPlan,
  AdvancedStats,
  CalendarEventsResponse,
  ActivityResponse,
} from "./types";

const API_BASE = "https://api.getsendia.com/api/client";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}
async function resolveToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new ApiError(401, "No active session");
  return session.access_token;
}
async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body.message ?? body.error ?? fallback;
  } catch {
    return fallback;
  }
}
async function assertResponseOk(res: Response): Promise<void> {
  if (res.status === 401) {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError(401, "Session expired");
  }
  if (!res.ok) {
    const message = await parseErrorMessage(res, `Request failed with status ${res.status}`);
    throw new ApiError(res.status, message);
  }
}
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await resolveToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  await assertResponseOk(res);
  return res.json() as Promise<T>;
}
function apiMutate<T>(method: "POST" | "PUT", path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method, body: JSON.stringify(body) });
}
async function apiFetchBlob(path: string): Promise<Blob> {
  const token = await resolveToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await assertResponseOk(res);
  return res.blob();
}
export const api = {
  getProfile: () =>
    apiFetch<ClientProfile>("/profile"),
  getStats: () =>
    apiFetch<ClientStats>("/stats"),
  getEmails: (limit = 10, offset = 0) =>
    apiFetch<EmailsResponse>(`/emails?limit=${limit}&offset=${offset}`),
  updateProfile: (body: ProfileUpdateBody) =>
    apiMutate<{ success: boolean }>("PUT", "/profile", body),
  toggleActive: (is_active?: boolean) =>
    apiMutate<{ success: boolean; is_active: boolean }>(
      "POST", "/toggle",
      is_active !== undefined ? { is_active } : {}
    ),
  ingestDocument: (file_name: string, content: string) =>
    apiMutate<{ success: boolean; chunks_ingested: number }>(
      "POST", "/rag/ingest", { file_name, content }
    ),
  getOnboardingStatus: () =>
    apiMutate<{
      email_verified: boolean;
      profile_complete: boolean;
      email_connected: boolean;
      documents_uploaded: boolean;
      ready: boolean;
    }>("POST", "/onboarding-status", {}),
  getBillingStatus: () =>
    apiFetch<BillingStatus>("/billing/status"),
  getBillingPlans: () =>
    apiFetch<BillingPlan[]>("/billing/plans"),
  createCheckout: (plan: string) =>
    apiMutate<{ url: string }>("POST", "/billing/checkout", { plan }),
  openBillingPortal: () =>
    apiMutate<{ url: string }>("POST", "/billing/portal", {}),
  getAdvancedStats: (period: string) =>
    apiFetch<AdvancedStats>(`/stats/advanced?period=${period}`),
  getCalendarEvents: () =>
    apiFetch<CalendarEventsResponse>("/calendar/events"),
  exportCSV: (period: string) =>
    apiFetchBlob(`/emails/export?period=${period}`),
  getActivity: () =>
    apiFetch<ActivityResponse>("/activity"),
};
