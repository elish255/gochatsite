-- Deploy before the application PR. Existing payment records are never rewritten.
BEGIN;
CREATE TABLE public.gochati_activation_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.gochati_activation_settings (id, enabled) VALUES (true, true);
ALTER TABLE public.gochati_activation_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gochati_activation_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.gochati_activation_settings TO authenticated;
GRANT ALL ON public.gochati_activation_settings TO service_role;
CREATE POLICY "Read activation policy" ON public.gochati_activation_settings
  FOR SELECT TO authenticated USING (true);

CREATE FUNCTION public.gochati_has_activation_access(p_status text, p_paid boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(
    p_status IN ('active', 'pending', 'inactive') AND
    ((p_status = 'active' AND p_paid) OR
      NOT COALESCE((SELECT enabled FROM public.gochati_activation_settings WHERE id = true), true)),
    false);
$$;
REVOKE ALL ON FUNCTION public.gochati_has_activation_access(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gochati_has_activation_access(text, boolean) TO authenticated, service_role;

create or replace function public.gochati_start_earning_session(p_amount numeric, p_minutes integer, p_partner text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if not exists(select 1 from public.gochati_users where id=auth.uid() and public.gochati_has_activation_access(account_status, activation_paid)) then raise exception 'Account is not active'; end if;
 if not ((p_minutes,p_amount) in ((1,5000),(5,25000),(10,25000),(20,30000),(45,67000),(60,120000),(120,150000))) then raise exception 'Invalid session duration or amount'; end if;
 if nullif(trim(p_partner),'') is null then raise exception 'Chat partner required'; end if;
 insert into public.gochati_chat_sessions(user_id,partner_id,amount,duration_minutes) values(auth.uid(),left(p_partner,100),p_amount,p_minutes) returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.gochati_start_earning_session(numeric,integer,text) from public, anon;
grant execute on function public.gochati_start_earning_session(numeric,integer,text) to authenticated;

create or replace function public.gochati_complete_earning_session(p_session_id uuid)
returns numeric language plpgsql security definer set search_path=public as $$
declare v_session public.gochati_chat_sessions%rowtype; v_balance numeric(12,2);
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into v_session from public.gochati_chat_sessions where id=p_session_id and user_id=auth.uid() for update;
 if not found then raise exception 'Chat session not found'; end if;
 if v_session.status <> 'active' then raise exception 'Chat session already completed'; end if;
 if now() < v_session.started_at + make_interval(mins => v_session.duration_minutes) then raise exception 'Chat duration has not elapsed'; end if;
 update public.gochati_users set balance=balance+v_session.amount, updated_at=now()
 where id=auth.uid() and public.gochati_has_activation_access(account_status, activation_paid) returning balance into v_balance;
 if not found then raise exception 'Account is not active'; end if;
 update public.gochati_chat_sessions set status='completed',completed_at=now() where id=v_session.id;
 return v_balance;
end; $$;
revoke all on function public.gochati_complete_earning_session(uuid) from public, anon;
grant execute on function public.gochati_complete_earning_session(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.gochati_request_withdrawal(p_amount numeric, p_phone text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user public.gochati_users%ROWTYPE;
  v_withdrawal_id uuid;
  v_fee numeric(12,2);
  v_net_amount numeric(12,2);
  v_last_withdrawal_at timestamptz;
  v_cooldown_until timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tafadhali ingia tena.';
  END IF;

  IF p_amount IS NULL OR p_amount <> trunc(p_amount) OR p_amount < 100000 OR p_amount > 100000000 THEN
    RAISE EXCEPTION 'Kiasi cha withdrawal si sahihi.';
  END IF;

  IF p_phone IS NULL OR p_phone !~ '^[+0-9 ]{9,16}$' THEN
    RAISE EXCEPTION 'Namba ya simu si sahihi.';
  END IF;

  SELECT * INTO v_user
  FROM public.gochati_users
  WHERE id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Akaunti haijapatikana.';
  END IF;

  IF v_user.account_status <> 'active' AND NOT public.gochati_has_activation_access(v_user.account_status, v_user.activation_paid) THEN
    RAISE EXCEPTION 'Akaunti yako haijawezeshwa.';
  END IF;

  IF COALESCE(v_user.balance, 0) < 100000 OR COALESCE(v_user.balance, 0) < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Salio halitoshi kufanya Withdrawal.';
  END IF;

  IF NOT COALESCE(v_user.is_vip, false) THEN
    IF COALESCE(v_user.is_premium, false) THEN
      IF COALESCE(v_user.balance, 0) < 300000 THEN
        RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Salio halitoshi kufanya Withdrawal.';
      END IF;

      RAISE EXCEPTION 'UPGRADE_REQUIRED_VIP: Upgrade kwenda VIP ili uendelee.';
    END IF;

    RAISE EXCEPTION 'UPGRADE_REQUIRED_PREMIUM: Upgrade kwenda Premium ili uendelee.';
  END IF;

  SELECT max(created_at) INTO v_last_withdrawal_at
  FROM public.gochati_withdrawals
  WHERE user_id = auth.uid();

  IF v_last_withdrawal_at IS NOT NULL THEN
    v_cooldown_until := v_last_withdrawal_at + interval '30 minutes';

    IF clock_timestamp() < v_cooldown_until THEN
      RAISE EXCEPTION 'WITHDRAWAL_COOLDOWN: Subiri dakika 30 kabla ya kufanya withdrawal nyingine.'
        USING DETAIL = 'cooldown_until=' || v_cooldown_until::text;
    END IF;
  END IF;

  IF NOT COALESCE(v_user.vip_tax_paid, false) THEN
    RAISE EXCEPTION 'TAX_PAYMENT_REQUIRED: Lipa Tax ili kuendelea na withdrawal.';
  END IF;

  v_fee := round(p_amount * 0.20, 2);
  v_net_amount := p_amount - v_fee;

  UPDATE public.gochati_users
  SET balance = balance - p_amount, updated_at = now()
  WHERE id = auth.uid();

  INSERT INTO public.gochati_withdrawals
    (user_id, phone, amount, fee, net_amount, status)
  VALUES
    (auth.uid(), btrim(p_phone), p_amount, v_fee, v_net_amount, 'pending')
  RETURNING id INTO v_withdrawal_id;

  RETURN v_withdrawal_id;
END;
$function$;

COMMIT;
