CREATE OR REPLACE FUNCTION public.gochati_create_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_base text;
  v_username text;
  v_suffix integer := 0;
  v_referrer uuid;
  v_country text;
BEGIN
  v_base := lower(coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(coalesce(new.email, ''), '@', 1), 'user'));
  v_base := regexp_replace(v_base, '[^a-z0-9_]', '', 'g');
  IF length(v_base) < 3 THEN
    v_base := 'user_' || left(replace(new.id::text, '-', ''), 8);
  END IF;
  v_base := left(v_base, 24);
  v_username := v_base;

  WHILE EXISTS (
    SELECT 1 FROM public.gochati_users u
    WHERE lower(u.username) = lower(v_username) AND u.id <> new.id
  ) LOOP
    v_suffix := v_suffix + 1;
    v_username := left(v_base, 24 - length(v_suffix::text) - 1) || '_' || v_suffix::text;
  END LOOP;

  v_country := nullif(trim(new.raw_user_meta_data->>'country'), '');
  IF lower(coalesce(v_country, '')) IN ('tz', 'tza', '255') THEN
    v_country := 'Tanzania';
  END IF;

  IF nullif(trim(new.raw_user_meta_data->>'referral_username'), '') IS NOT NULL THEN
    SELECT id INTO v_referrer
    FROM public.gochati_users
    WHERE lower(username) = lower(trim(new.raw_user_meta_data->>'referral_username'))
      AND id <> new.id
      AND referrals_enabled IS TRUE
    LIMIT 1;
  END IF;

  INSERT INTO public.gochati_users AS existing
    (id, email, full_name, username, phone, country, referred_by, account_status, activation_paid)
  VALUES
    (new.id, lower(new.email),
     coalesce(new.raw_user_meta_data->>'full_name', ''),
     v_username,
     coalesce(new.raw_user_meta_data->>'phone', ''),
     coalesce(v_country, ''),
     v_referrer,
     'active',
     true)
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    country = excluded.country,
    account_status = 'active',
    activation_paid = true,
    referred_by = coalesce(existing.referred_by, excluded.referred_by);

  IF v_referrer IS NOT NULL THEN
    UPDATE public.gochati_users
    SET referral_count = referral_count + 1, updated_at = now()
    WHERE id = v_referrer AND referrals_enabled IS TRUE;
  END IF;

  INSERT INTO public.gochati_admin_events(kind, user_id, username)
  VALUES ('registration', new.id, v_username);

  RETURN new;
END;
$$;
