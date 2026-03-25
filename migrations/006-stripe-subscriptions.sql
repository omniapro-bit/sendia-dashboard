-- ============================================================
-- Migration 006: Stripe subscription integration
-- Sendia Dashboard
--
-- Changes:
--   1. Add Stripe billing columns to clients_final
--   2. Create plan_features reference table
--   3. Create subscription_events audit table
--   4. Replace handle_new_user() to include plan_status
--      and trial_ends_at on new signups
--
-- Idempotency: all DDL uses IF NOT EXISTS / OR REPLACE.
--              Safe to re-run after a partial failure.
--
-- Prerequisites: migrations 001-005 applied.
-- ============================================================


-- ── Step 1: Add Stripe columns to clients_final ─────────────
--
-- plan_status tracks the Stripe subscription lifecycle:
--   trial | active | past_due | canceled | unpaid
--
-- stripe_customer_id and stripe_subscription_id are unique
-- per row but may be NULL (pre-checkout users), so the
-- indexes use a WHERE NOT NULL partial predicate.

ALTER TABLE public.clients_final
  ADD COLUMN IF NOT EXISTS stripe_customer_id            TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id        TEXT,
  ADD COLUMN IF NOT EXISTS plan_status                   TEXT NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canceled_at                   TIMESTAMPTZ;

-- Partial unique indexes: enforce uniqueness only for non-NULL
-- values so multiple pre-checkout rows can coexist with NULL.
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_stripe_customer_id
  ON public.clients_final (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_stripe_subscription_id
  ON public.clients_final (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;


-- ── Step 2: Create plan_features reference table ────────────
--
-- Single source of truth for per-plan entitlements and Stripe
-- price IDs.  Application code reads this table at runtime
-- rather than hard-coding limits in business logic.
--
-- emails_per_month = -1 means unlimited (Enterprise).
-- rag_max_docs     = -1 means unlimited (Enterprise).
--
-- stripe_price_id is NULL for the free trial and must be
-- replaced with real Stripe price IDs before going live.

CREATE TABLE IF NOT EXISTS public.plan_features (
  plan                TEXT PRIMARY KEY,
  display_name        TEXT    NOT NULL,
  emails_per_month    INT     NOT NULL,
  email_accounts      INT     NOT NULL DEFAULT 1,
  rag_max_docs        INT     NOT NULL DEFAULT 5,
  custom_prompts      BOOLEAN NOT NULL DEFAULT false,
  custom_signature    BOOLEAN NOT NULL DEFAULT false,
  calendar_enabled    BOOLEAN NOT NULL DEFAULT false,
  price_cents         INT     NOT NULL DEFAULT 0,
  stripe_price_id     TEXT
);

-- Seed plan definitions.  ON CONFLICT DO UPDATE lets this block
-- be re-run without duplicating rows while still reflecting any
-- value changes made during development.
INSERT INTO public.plan_features
  (plan, display_name, emails_per_month, email_accounts, rag_max_docs,
   custom_prompts, custom_signature, calendar_enabled, price_cents, stripe_price_id)
VALUES
  ('trial',        'Essai gratuit (14 jours)', 1000,  3,  30, true,  true,  true,  0,     NULL),
  ('starter',      'Starter',                   200,  1,   5, false, false, false, 2900, 'price_placeholder_starter'),
  ('professional', 'Professional',             1000,  3,  30, true,  true,  true,  7900, 'price_placeholder_pro'),
  ('enterprise',   'Enterprise',                 -1, 10,  -1, true,  true,  true, 11900, 'price_placeholder_enterprise')
ON CONFLICT (plan) DO UPDATE SET
  display_name        = EXCLUDED.display_name,
  emails_per_month    = EXCLUDED.emails_per_month,
  email_accounts      = EXCLUDED.email_accounts,
  rag_max_docs        = EXCLUDED.rag_max_docs,
  custom_prompts      = EXCLUDED.custom_prompts,
  custom_signature    = EXCLUDED.custom_signature,
  calendar_enabled    = EXCLUDED.calendar_enabled,
  price_cents         = EXCLUDED.price_cents,
  stripe_price_id     = EXCLUDED.stripe_price_id;


-- ── Step 3: Create subscription_events audit table ──────────
--
-- Append-only log of every Stripe webhook event processed.
-- stripe_event_id has a UNIQUE constraint so that webhook
-- replays (Stripe retries) are idempotent — a second INSERT
-- for the same event_id will fail with a unique_violation,
-- which the webhook handler should swallow and return 200.
--
-- payload stores the raw Stripe event object so we can replay
-- or audit any transition without going back to Stripe's API.

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id             BIGSERIAL    PRIMARY KEY,
  client_id      UUID         REFERENCES public.clients_final (client_id),
  stripe_event_id TEXT        NOT NULL UNIQUE,
  event_type     TEXT         NOT NULL,
  payload        JSONB        NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Composite index supports the most common query pattern:
-- "show all events for client X, newest first".
CREATE INDEX IF NOT EXISTS idx_sub_events_client
  ON public.subscription_events (client_id, created_at DESC);


-- ── Step 4: Replace handle_new_user() ───────────────────────
--
-- Adds plan_status = 'trial' and trial_ends_at = NOW() + 14 days
-- to the INSERT for brand-new signups (Case B).
--
-- The UPDATE path (Case A — pre-existing row) is intentionally
-- left unchanged: pre-created clients already have plan data
-- set by the admin and should not be overwritten on first login.
--
-- All other behaviour is preserved from migration 005.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_client_id uuid;
  v_name               text;
BEGIN
  -- Derive a human-readable name from the email local-part.
  -- "john.doe+work@example.com" → "john.doe"
  -- Lower-cased; the dashboard can capitalise as needed.
  v_name := split_part(NEW.email, '@', 1);

  -- ── Case A: row already exists for this email ────────────
  -- This happens when a client was created manually by an
  -- admin before the user signed up.  We preserve all existing
  -- configuration and simply attach the auth identity.
  SELECT client_id
    INTO v_existing_client_id
    FROM public.clients_final
   WHERE client_email = NEW.email
   LIMIT 1;

  IF v_existing_client_id IS NOT NULL THEN
    UPDATE public.clients_final
       SET user_id     = NEW.id,
           -- Overwrite name only if it was left blank
           client_name = CASE
                           WHEN client_name IS NULL OR client_name = ''
                           THEN v_name
                           ELSE client_name
                         END
     WHERE client_id = v_existing_client_id
       -- Guard: do not overwrite an already-linked user_id.
       -- If two auth accounts share the same email (edge case
       -- after a manual delete + re-signup) we leave the first
       -- binding intact and log a notice instead of silently
       -- overwriting it.
       AND (user_id IS NULL OR user_id = NEW.id);

    RETURN NEW;
  END IF;

  -- ── Case B: brand-new signup, no pre-existing row ────────
  INSERT INTO public.clients_final (
    client_id,
    user_id,
    client_email,
    client_name,
    company_name,
    whatsapp_number,
    email_provider,
    industry,
    tone_preference,
    signature,
    language,
    timezone,
    custom_prompt_context,
    greeting_style,
    is_active,
    plan,
    plan_status,
    trial_ends_at,
    feature_auto_skip_newsletter,
    feature_auto_skip_spam,
    feature_notification_mode,
    feature_rag_enabled
  ) VALUES (
    gen_random_uuid(),          -- client_id
    NEW.id,                     -- user_id  → links to auth.users
    NEW.email,                  -- client_email
    v_name,                     -- client_name  (email local-part)
    NULL,                       -- company_name  (filled during onboarding)
    NULL,                       -- whatsapp_number  (filled during onboarding)
    NULL,                       -- email_provider  (set after OAuth)
    NULL,                       -- industry
    'professional',             -- tone_preference  — safe default
    NULL,                       -- signature  (filled during onboarding)
    'fr',                       -- language
    'Europe/Paris',             -- timezone
    NULL,                       -- custom_prompt_context
    '',                         -- greeting_style  (empty = auto)
    false,                      -- is_active  — user must connect OAuth first
    'trial',                    -- plan
    'trial',                    -- plan_status  — Stripe lifecycle state
    NOW() + INTERVAL '14 days', -- trial_ends_at
    true,                       -- feature_auto_skip_newsletter
    true,                       -- feature_auto_skip_spam
    'whatsapp',                 -- feature_notification_mode
    false                       -- feature_rag_enabled  (enabled per plan)
  );

  RETURN NEW;

EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: two concurrent signups for the same email.
    -- The second INSERT loses; fall back to the UPDATE path.
    UPDATE public.clients_final
       SET user_id = NEW.id
     WHERE client_email = NEW.email
       AND user_id IS NULL;
    RETURN NEW;
END;
$$;

-- Re-create trigger (DROP + CREATE is idempotent and ensures the
-- updated function body is bound to the trigger).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Re-apply function grants from migration 005.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;


-- ── Step 5: Verification queries (informational, read-only) ─
--
-- Uncomment and run after applying the migration to confirm
-- all objects were created correctly.

-- Check new columns on clients_final:
-- SELECT column_name, data_type, column_default, is_nullable
--   FROM information_schema.columns
--  WHERE table_schema = 'public'
--    AND table_name   = 'clients_final'
--    AND column_name  IN (
--          'stripe_customer_id', 'stripe_subscription_id',
--          'plan_status', 'subscription_current_period_end', 'canceled_at')
--  ORDER BY ordinal_position;

-- Check plan_features seed data:
-- SELECT plan, display_name, price_cents, stripe_price_id
--   FROM public.plan_features
--  ORDER BY price_cents;

-- Check subscription_events table and index:
-- SELECT tablename, indexname
--   FROM pg_indexes
--  WHERE tablename = 'subscription_events';

-- Check trigger is registered:
-- SELECT trigger_name, event_manipulation, action_timing
--   FROM information_schema.triggers
--  WHERE event_object_schema = 'auth'
--    AND event_object_table  = 'users'
--    AND trigger_name        = 'on_auth_user_created';
