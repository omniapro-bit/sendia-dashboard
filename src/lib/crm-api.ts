import { supabase } from "./supabase";

const CRM_BASE = process.env.NEXT_PUBLIC_API_BASE
  ? `${process.env.NEXT_PUBLIC_API_BASE}/api/crm`
  : "https://api.getsendia.com/api/crm";

async function resolveToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("No active session");
  return session.access_token;
}

async function signOutAndRedirect(): Promise<never> {
  await supabase.auth.signOut();
  if (typeof window !== "undefined") window.location.href = "/login";
  throw new Error("Session expired");
}

async function crmFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await resolveToken();
  const res = await fetch(`${CRM_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  });
  if (res.status === 401) {
    // Try refreshing the session before giving up
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshData?.session && !refreshError) {
      // Retry with the new token
      const retryRes = await fetch(`${CRM_BASE}${path}`, {
        ...opts,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${refreshData.session.access_token}`, ...(opts.headers ?? {}) },
      });
      if (retryRes.ok) return retryRes.json() as Promise<T>;
    }
    // Refresh failed or retry still 401 — sign out
    return signOutAndRedirect();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `CRM request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface CrmContact {
  id: string; email: string; display_name: string; company_name: string;
  tag: string; phone: string; notes: string; email_count: number;
  last_intention: string; first_seen_at: string; last_seen_at: string;
}

export interface CrmInteraction {
  id: string; contact_id: string; email_id: string | null;
  direction: string; subject: string; summary: string;
  intention: string; urgency: string; status: string;
  contact_name: string; contact_email: string; created_at: string;
}

export interface CrmStats {
  contacts: { total: number; by_tag: Record<string, number> };
  interactions_7d: number;
}

export const crmApi = {
  getContacts: (params?: { tag?: string; search?: string; sort?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.tag) qs.set("tag", params.tag);
    if (params?.search) qs.set("search", params.search);
    if (params?.sort) qs.set("sort", params.sort);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.offset) qs.set("offset", String(params.offset));
    const q = qs.toString();
    return crmFetch<{ contacts: CrmContact[]; total: number }>(`/contacts${q ? `?${q}` : ""}`);
  },
  getContact: (id: string) =>
    crmFetch<{ contact: CrmContact; interactions: CrmInteraction[] }>(`/contacts/${id}`),
  updateContact: (id: string, body: Partial<Pick<CrmContact, "tag" | "company_name" | "phone" | "notes" | "display_name">>) =>
    crmFetch<CrmContact>(`/contacts/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  getInteractions: (params?: { contact_id?: string; intention?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.contact_id) qs.set("contact_id", params.contact_id);
    if (params?.intention) qs.set("intention", params.intention);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return crmFetch<{ interactions: CrmInteraction[] }>(`/interactions${q ? `?${q}` : ""}`);
  },
  getStats: () => crmFetch<CrmStats>("/stats"),
};
