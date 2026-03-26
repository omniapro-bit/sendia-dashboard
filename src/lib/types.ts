export interface ClientProfile {
  client_id: string;
  client_name: string;
  company_name: string;
  client_email: string;
  is_active: boolean;
  signature: string;
  tone_preference: string;
  custom_prompt_context: string;
  greeting_style: string;
  language: string;
  timezone: string;
  plan: string;
  feature_auto_skip_newsletter: boolean;
  feature_auto_skip_spam: boolean;
  feature_notification_mode: string;
  feature_rag_enabled: boolean;
  whatsapp_number?: string;
  email_provider?: string;
  prompt_devis?: string;
  prompt_lead?: string;
  prompt_support?: string;
  prompt_relance?: string;
  prompt_autre?: string;
}

export type StatPeriod = { processed: number; sent: number; rejected: number };
export type ClientStats = {
  today: StatPeriod;
  week: StatPeriod;
  month: StatPeriod;
  rag_documents: number;
  preferences_count: number;
};
export type Email = {
  id: string;
  from_name: string;
  from_email: string;
  subject: string;
  intention: string;
  status: string;
  category?: string;
  created_at: string;
};
export type EmailsResponse = { emails: Email[]; total: number };
export type ProfileUpdateBody = {
  client_name?: string;
  company_name?: string;
  whatsapp_number?: string;
  signature?: string;
  tone_preference?: string;
  custom_prompt_context?: string;
  greeting_style?: string;
  is_active?: boolean;
  prompt_devis?: string;
  prompt_lead?: string;
  prompt_support?: string;
  prompt_relance?: string;
  prompt_autre?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date_start: string;
  date_end: string;
  location?: string;
  source_email_subject?: string;
  status: "pending" | "confirmed" | "expired";
  created_at: string;
};

export type CalendarEventsResponse = {
  events: CalendarEvent[];
};

export type RagDocument = {
  id: string;
  doc_title: string;
  doc_type: string;
  created_at: string;
};

export type BillingStatus = {
  status: "trial" | "active" | "expired" | "canceled";
  plan: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  emails_used_this_month: number;
  emails_limit: number | null;
};

export type BillingPlan = {
  id: string;
  name: string;
  price: number;
  features: string[];
};

export type DailyCount = {
  date: string;
  count: number;
  sent: number;
  rejected: number;
};

export type TypeCount = {
  type: string;
  count: number;
  sent: number;
  rejected: number;
};

export type AdvancedStats = {
  daily_counts: DailyCount[];
  by_type: TypeCount[];
  response_rate: number;
  avg_daily: number;
  trend: "up" | "down" | "stable";
};
