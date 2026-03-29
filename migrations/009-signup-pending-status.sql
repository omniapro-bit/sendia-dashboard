-- ============================================================
-- Migration 009: Signup creates pending status (not trial)
-- Date: 2026-03-29
--
-- New users start with plan_status = 'pending' (no trial_ends_at).
-- Trial begins only after Stripe checkout with 14-day trial.
-- OAuth connection blocked until plan_status is active/trial.
-- ============================================================

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
  v_name := split_part(NEW.email, '@', 1);

  -- Case A: row already exists for this email
  SELECT client_id
    INTO v_existing_client_id
    FROM public.clients_final
   WHERE client_email = NEW.email
   LIMIT 1;

  IF v_existing_client_id IS NOT NULL THEN
    UPDATE public.clients_final
       SET user_id     = NEW.id,
           client_name = CASE
                           WHEN client_name IS NULL OR client_name = ''
                           THEN v_name
                           ELSE client_name
                         END
     WHERE client_id = v_existing_client_id
       AND (user_id IS NULL OR user_id = NEW.id);
    RETURN NEW;
  END IF;

  -- Case B: brand-new signup — starts as pending (no trial yet)
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
    gen_random_uuid(),
    NEW.id,
    NEW.email,
    v_name,
    NULL,
    NULL,
    NULL,
    NULL,
    'professionnel',
    NULL,
    'fr',
    'Europe/Paris',
    NULL,
    '',
    false,
    'trial',
    'pending',
    NULL,
    true,
    true,
    'notify',
    false
  );

  RETURN NEW;
END;
$$;

-- Permissions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
