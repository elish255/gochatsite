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

  IF v_user.account_status <> 'active' THEN
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
