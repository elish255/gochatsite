-- Apply after 202611210001_activation_fee_toggle.sql in the GoChati database.
-- Enforce policy at the profile write so both Auth triggers and the separately
-- deployed signup Edge Function upsert use the same setting.
BEGIN;
CREATE OR REPLACE FUNCTION public.gochati_apply_signup_activation_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_enabled boolean;
BEGIN
  SELECT enabled INTO v_enabled FROM public.gochati_activation_settings WHERE id = true;
  v_enabled := coalesce(v_enabled, true);

  IF TG_OP = 'INSERT' THEN
    -- Registration is not payment, even if a legacy Auth trigger supplies true.
    NEW.activation_paid := false;
    IF NEW.account_status IN ('active', 'pending', 'inactive') THEN
      NEW.account_status := CASE WHEN v_enabled THEN 'pending' ELSE 'active' END;
    END IF;
  ELSE
    -- Do not apply the waiver to a previously suspended profile.
    IF OLD.account_status IN ('banned', 'deactivated') THEN
      RETURN NEW;
    END IF;
    -- Normalize the legacy Edge Function's inactive upsert while waived.
    -- Do not touch paid flags, balances, memberships, or suspension decisions.
    IF NOT v_enabled AND NEW.account_status IN ('pending', 'inactive') THEN
      NEW.account_status := 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.gochati_apply_signup_activation_policy() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS gochati_signup_activation_policy ON public.gochati_users;
CREATE TRIGGER gochati_signup_activation_policy
BEFORE INSERT OR UPDATE OF account_status, activation_paid ON public.gochati_users
FOR EACH ROW EXECUTE FUNCTION public.gochati_apply_signup_activation_policy();
COMMIT;
