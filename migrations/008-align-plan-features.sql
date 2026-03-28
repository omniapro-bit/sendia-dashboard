-- ============================================================
-- Migration 008: Align plan_features with Stripe plan names
-- Date: 2026-03-29
-- ============================================================

-- Clean old naming
DELETE FROM plan_features WHERE plan IN ('pro', 'business');

-- Upsert trial (14 jours gratuit)
INSERT INTO plan_features (
  plan, display_name, emails_per_month, email_accounts, rag_max_docs, price_cents,
  custom_prompts, custom_signature, calendar_enabled,
  has_agent, has_modification, has_rag_search,
  has_conversation_memory, has_email_search, has_custom_prompt,
  has_compose, has_followup, has_calendar, has_multi_mailbox,
  max_emails_per_month
) VALUES (
  'trial', 'Trial', 50, 1, 5, 0,
  false, false, false,
  true, true, true,
  true, false, false,
  true, false, false, false,
  50
)
ON CONFLICT (plan) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  emails_per_month = EXCLUDED.emails_per_month,
  email_accounts = EXCLUDED.email_accounts,
  rag_max_docs = EXCLUDED.rag_max_docs,
  price_cents = EXCLUDED.price_cents,
  custom_prompts = EXCLUDED.custom_prompts,
  custom_signature = EXCLUDED.custom_signature,
  calendar_enabled = EXCLUDED.calendar_enabled,
  has_agent = EXCLUDED.has_agent,
  has_modification = EXCLUDED.has_modification,
  has_rag_search = EXCLUDED.has_rag_search,
  has_conversation_memory = EXCLUDED.has_conversation_memory,
  has_email_search = EXCLUDED.has_email_search,
  has_custom_prompt = EXCLUDED.has_custom_prompt,
  has_compose = EXCLUDED.has_compose,
  has_followup = EXCLUDED.has_followup,
  has_calendar = EXCLUDED.has_calendar,
  has_multi_mailbox = EXCLUDED.has_multi_mailbox,
  max_emails_per_month = EXCLUDED.max_emails_per_month;

-- Upsert starter (29€/mois)
INSERT INTO plan_features (
  plan, display_name, emails_per_month, email_accounts, rag_max_docs, price_cents,
  custom_prompts, custom_signature, calendar_enabled,
  has_agent, has_modification, has_rag_search,
  has_conversation_memory, has_email_search, has_custom_prompt,
  has_compose, has_followup, has_calendar, has_multi_mailbox,
  max_emails_per_month
) VALUES (
  'starter', 'Starter', 200, 1, 10, 2900,
  false, false, false,
  true, true, true,
  true, false, false,
  true, true, false, false,
  200
)
ON CONFLICT (plan) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  emails_per_month = EXCLUDED.emails_per_month,
  email_accounts = EXCLUDED.email_accounts,
  rag_max_docs = EXCLUDED.rag_max_docs,
  price_cents = EXCLUDED.price_cents,
  custom_prompts = EXCLUDED.custom_prompts,
  custom_signature = EXCLUDED.custom_signature,
  calendar_enabled = EXCLUDED.calendar_enabled,
  has_agent = EXCLUDED.has_agent,
  has_modification = EXCLUDED.has_modification,
  has_rag_search = EXCLUDED.has_rag_search,
  has_conversation_memory = EXCLUDED.has_conversation_memory,
  has_email_search = EXCLUDED.has_email_search,
  has_custom_prompt = EXCLUDED.has_custom_prompt,
  has_compose = EXCLUDED.has_compose,
  has_followup = EXCLUDED.has_followup,
  has_calendar = EXCLUDED.has_calendar,
  has_multi_mailbox = EXCLUDED.has_multi_mailbox,
  max_emails_per_month = EXCLUDED.max_emails_per_month;

-- Upsert professional (79€/mois)
INSERT INTO plan_features (
  plan, display_name, emails_per_month, email_accounts, rag_max_docs, price_cents,
  custom_prompts, custom_signature, calendar_enabled,
  has_agent, has_modification, has_rag_search,
  has_conversation_memory, has_email_search, has_custom_prompt,
  has_compose, has_followup, has_calendar, has_multi_mailbox,
  max_emails_per_month
) VALUES (
  'professional', 'Professional', 1000, 3, 30, 7900,
  true, true, true,
  true, true, true,
  true, true, true,
  true, true, true, false,
  1000
)
ON CONFLICT (plan) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  emails_per_month = EXCLUDED.emails_per_month,
  email_accounts = EXCLUDED.email_accounts,
  rag_max_docs = EXCLUDED.rag_max_docs,
  price_cents = EXCLUDED.price_cents,
  custom_prompts = EXCLUDED.custom_prompts,
  custom_signature = EXCLUDED.custom_signature,
  calendar_enabled = EXCLUDED.calendar_enabled,
  has_agent = EXCLUDED.has_agent,
  has_modification = EXCLUDED.has_modification,
  has_rag_search = EXCLUDED.has_rag_search,
  has_conversation_memory = EXCLUDED.has_conversation_memory,
  has_email_search = EXCLUDED.has_email_search,
  has_custom_prompt = EXCLUDED.has_custom_prompt,
  has_compose = EXCLUDED.has_compose,
  has_followup = EXCLUDED.has_followup,
  has_calendar = EXCLUDED.has_calendar,
  has_multi_mailbox = EXCLUDED.has_multi_mailbox,
  max_emails_per_month = EXCLUDED.max_emails_per_month;

-- Upsert enterprise (sur devis)
INSERT INTO plan_features (
  plan, display_name, emails_per_month, email_accounts, rag_max_docs, price_cents,
  custom_prompts, custom_signature, calendar_enabled,
  has_agent, has_modification, has_rag_search,
  has_conversation_memory, has_email_search, has_custom_prompt,
  has_compose, has_followup, has_calendar, has_multi_mailbox,
  max_emails_per_month
) VALUES (
  'enterprise', 'Enterprise', -1, 10, -1, 0,
  true, true, true,
  true, true, true,
  true, true, true,
  true, true, true, true,
  999999
)
ON CONFLICT (plan) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  emails_per_month = EXCLUDED.emails_per_month,
  email_accounts = EXCLUDED.email_accounts,
  rag_max_docs = EXCLUDED.rag_max_docs,
  price_cents = EXCLUDED.price_cents,
  custom_prompts = EXCLUDED.custom_prompts,
  custom_signature = EXCLUDED.custom_signature,
  calendar_enabled = EXCLUDED.calendar_enabled,
  has_agent = EXCLUDED.has_agent,
  has_modification = EXCLUDED.has_modification,
  has_rag_search = EXCLUDED.has_rag_search,
  has_conversation_memory = EXCLUDED.has_conversation_memory,
  has_email_search = EXCLUDED.has_email_search,
  has_custom_prompt = EXCLUDED.has_custom_prompt,
  has_compose = EXCLUDED.has_compose,
  has_followup = EXCLUDED.has_followup,
  has_calendar = EXCLUDED.has_calendar,
  has_multi_mailbox = EXCLUDED.has_multi_mailbox,
  max_emails_per_month = EXCLUDED.max_emails_per_month;

-- Verify
SELECT plan, display_name, max_emails_per_month, price_cents,
       has_agent, has_compose, has_followup, has_calendar,
       has_email_search, has_custom_prompt, has_multi_mailbox
FROM plan_features
ORDER BY price_cents, max_emails_per_month;
