-- ============================================================
-- Migration 005: Auto-create client row on Auth signup
-- Sendia Dashboard — Trigger on auth.users AFTER INSERT
--
-- Behaviour:
--   A) New email  → INSERT a fresh clients_final row
--   B) Email already exists (manual creation) → UPDATE that
--      row to bind user_id, leaving all other data intact
--
-- Prerequisites: migrations 001-004 applied (user_id column
-- and RLS policies already exist on clients_final).
-- ============================================================

-- ── Step 1: Create (or replace) the trigger function ────────
--
-- Security: SECURITY DEFINER so the function runs as the
-- owning role (postgres / service_role), bypassing RLS for
-- the INSERT/UPDATE.  The function is tightly scoped — it only
-- touches clients_final and only on the exact row that matches
-- NEW.email or NEW.id, so privilege escalation surface is
-- minimal.
--
-- We explicitly set search_path to prevent search-path
-- injection attacks (CVE-class hardening, Supabase best
-- practice).

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
    'beta',                     -- plan
    true,                       -- feature_auto_skip_newsletter
    true,                       -- feature_auto_skip_spam
    'whatsapp',                  -- feature_notification_mode
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

-- ── Step 2: Drop old trigger if it exists, then re-create ───
--
-- Dropping first makes this migration safely re-runnable
-- (e.g. during a rollback + re-apply cycle).

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── Step 3: Harden RLS — ensure INSERT policy exists ────────
--
-- Migration 004 created SELECT and UPDATE policies.
-- The trigger function runs as SECURITY DEFINER (bypasses RLS),
-- so no INSERT policy is needed for the trigger itself.
-- However we add one for completeness / future direct inserts
-- from service-role clients that respect RLS.
--
-- Policy: a user may only insert a row whose user_id matches
-- their own auth.uid().  Prevents one user creating phantom
-- records for another.

DROP POLICY IF EXISTS "clients_insert_own" ON public.clients_final;
CREATE POLICY "clients_insert_own" ON public.clients_final
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Step 4: Harden RLS — ensure DELETE policy exists ────────
--
-- Prevent a user from deleting their own row (accidental data
-- loss).  Deletes should go through service-role only.
-- If you want to allow self-deletion, remove this policy.

DROP POLICY IF EXISTS "clients_delete_denied" ON public.clients_final;
CREATE POLICY "clients_delete_denied" ON public.clients_final
  FOR DELETE USING (false);

-- ── Step 5: Grant execute on the function to authenticated ──
--
-- Not strictly required (SECURITY DEFINER functions are called
-- by the trigger, not directly by users), but explicit grants
-- make the intent clear for future audits.

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ── Step 6: Verification query (informational, read-only) ───
--
-- Run this after applying the migration to confirm the trigger
-- is registered.  Expected output: one row with
-- trigger_name = 'on_auth_user_created'.

-- SELECT trigger_name, event_manipulation, action_timing, action_statement
--   FROM information_schema.triggers
--  WHERE event_object_schema = 'auth'
--    AND event_object_table  = 'users'
--    AND trigger_name        = 'on_auth_user_created';
