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
};
