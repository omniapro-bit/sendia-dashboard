import { supabase } from "./supabase";
import type {
  ClientProfile,
  ClientStats,
  EmailsResponse,
  ProfileUpdateBody,
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
  if (res.status === 401) {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError(401, "Session expired");
  }
  if (!res.ok) {
    const message = await parseErrorMessage(res, `Request failed with status ${res.status}`);
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}
function apiMutate<T>(method: "POST" | "PUT", path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method, body: JSON.stringify(body) });
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
};
