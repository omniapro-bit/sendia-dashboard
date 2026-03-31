import { supabase } from "./supabase";

const CRM_BASE = process.env.NEXT_PUBLIC_API_BASE
  ? `${process.env.NEXT_PUBLIC_API_BASE}/api/crm`
  : "https://api.getsendia.com/api/crm";

async function crmFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("No active session");
  const res = await fetch(`${CRM_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, ...(opts.headers ?? {}) },
  });
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
  open_deals: string;
}
export interface CrmDeal {
  id: string; contact_id: string; title: string; stage: string;
  amount: number | null; notes: string; currency: string;
  contact_name: string; contact_email: string; contact_tag: string;
  source_email_id: string | null; closed_at: string | null;
  created_at: string; updated_at: string;
}

export interface CrmInteraction {
  id: string; contact_id: string; email_id: string | null;
  direction: string; subject: string; summary: string;
  intention: string; urgency: string; status: string;
  contact_name: string; contact_email: string; created_at: string;
}

export interface CrmStats {
  contacts: { total: number; by_tag: Record<string, number> };
  deals: { open: number; by_stage: Record<string, { count: number; amount: number }>; won_amount: number };
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
    crmFetch<{ contact: CrmContact; interactions: CrmInteraction[]; deals: CrmDeal[] }>(`/contacts/${id}`),
  updateContact: (id: string, body: Partial<Pick<CrmContact, "tag" | "company_name" | "phone" | "notes" | "display_name">>) =>
    crmFetch<CrmContact>(`/contacts/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  getDeals: (params?: { stage?: string; contact_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.stage) qs.set("stage", params.stage);
    if (params?.contact_id) qs.set("contact_id", params.contact_id);
    const q = qs.toString();
    return crmFetch<{ deals: CrmDeal[] }>(`/deals${q ? `?${q}` : ""}`);
  },
  createDeal: (body: { contact_id: string; title: string; stage?: string; amount?: number; notes?: string }) =>
    crmFetch<CrmDeal>("/deals", { method: "POST", body: JSON.stringify(body) }),
  updateDeal: (id: string, body: Partial<Pick<CrmDeal, "title" | "stage" | "amount" | "notes">>) =>
    crmFetch<CrmDeal>(`/deals/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteDeal: (id: string) =>
    crmFetch<{ deleted: boolean }>(`/deals/${id}`, { method: "DELETE" }),
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
