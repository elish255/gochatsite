-- Replace the request gate so admin-confirmed tax status, not a paid tier, controls eligibility.
CREATE OR REPLACE FUNCTION public.gochati_request_withdrawal(p_amount numeric, p_phone text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user public.gochati_users%ROWTYPE;
  v_withdrawal_id uuid;
  v_fee numeric(12,2);
  v_net_amount numeric(12,2);
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

  IF NOT COALESCE(v_user.vip_tax_paid, false) THEN
    RAISE EXCEPTION 'Admin hajathibitisha Tax Paid kwenye akaunti yako.';
  END IF;

  IF COALESCE(v_user.balance, 0) < p_amount THEN
    RAISE EXCEPTION 'Salio halitoshi.';
  END IF;

  v_fee := round(p_amount * 0.20, 2);
  v_net_amount := p_amount - v_fee;

  UPDATE public.gochati_users
  SET balance = balance - p_amount
  WHERE id = auth.uid();

  INSERT INTO public.gochati_withdrawals
    (user_id, username, phone, amount, fee, net_amount, status)
  VALUES
    (auth.uid(), v_user.username, btrim(p_phone), p_amount, v_fee, v_net_amount, 'pending')
  RETURNING id INTO v_withdrawal_id;

  RETURN v_withdrawal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.gochati_request_withdrawal(numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gochati_request_withdrawal(numeric, text) TO authenticated;
