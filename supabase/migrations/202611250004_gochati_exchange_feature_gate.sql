CREATE OR REPLACE FUNCTION public.gochati_start_exchange_session(p_partner text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_person_index integer;
  v_prices numeric[] := ARRAY[48500, 42500, 42000, 44500, 53000, 45500, 45000, 41000, 48500, 50500, 49500, 52000];
  v_amount numeric(12,2);
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in required';
  END IF;

  v_person_index := substring(coalesce(p_partner, '') FROM '^person-([0-9]+)$')::integer;
  IF v_person_index IS NULL OR v_person_index NOT BETWEEN 1 AND 52 THEN
    RAISE EXCEPTION 'Chat partner is invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.gochati_users
    WHERE id = (SELECT auth.uid())
      AND chat_enabled IS TRUE
      AND public.gochati_has_activation_access(account_status, activation_paid)
  ) THEN
    RAISE EXCEPTION 'Chat is disabled or account is not active';
  END IF;

  v_amount := v_prices[((v_person_index - 1) % cardinality(v_prices)) + 1];
  INSERT INTO public.gochati_exchange_sessions(user_id, partner_id, amount)
  VALUES ((SELECT auth.uid()), p_partner, v_amount)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.gochati_complete_chat_exchange(
  p_user_id uuid,
  p_session_id uuid,
  p_exchange_id uuid,
  p_partner text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session public.gochati_exchange_sessions%ROWTYPE;
  v_user public.gochati_users%ROWTYPE;
  v_inserted integer;
  v_balance numeric(12,2);
  v_message_count integer;
  v_rewarded boolean := false;
BEGIN
  IF coalesce((SELECT auth.role()), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required';
  END IF;

  SELECT * INTO v_session
  FROM public.gochati_exchange_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND
    OR v_session.user_id <> p_user_id
    OR v_session.partner_id <> p_partner
    OR v_session.status <> 'active'
    OR v_session.expires_at <= now()
  THEN
    RAISE EXCEPTION 'Exchange session is invalid or expired';
  END IF;

  SELECT * INTO v_user
  FROM public.gochati_users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND
    OR v_user.chat_enabled IS NOT TRUE
    OR NOT public.gochati_has_activation_access(v_user.account_status, v_user.activation_paid)
  THEN
    RAISE EXCEPTION 'Chat is disabled or account is not active';
  END IF;

  INSERT INTO public.gochati_chat_exchanges(session_id, exchange_id, user_id, amount)
  VALUES (v_session.id, p_exchange_id, p_user_id, v_session.amount)
  ON CONFLICT (session_id, exchange_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    RETURN jsonb_build_object(
      'balance', v_user.balance,
      'messageCount', v_session.message_count,
      'rewarded', false
    );
  END IF;

  UPDATE public.gochati_exchange_sessions
  SET message_count = message_count + 1
  WHERE id = v_session.id
  RETURNING message_count INTO v_message_count;

  IF v_message_count >= 10 AND v_session.reward_paid_at IS NULL THEN
    UPDATE public.gochati_users
    SET balance = balance + v_session.amount, updated_at = now()
    WHERE id = p_user_id
    RETURNING balance INTO v_balance;

    UPDATE public.gochati_exchange_sessions
    SET reward_paid_at = now(), status = 'completed'
    WHERE id = v_session.id;
    v_rewarded := true;
  ELSE
    v_balance := v_user.balance;
  END IF;

  RETURN jsonb_build_object(
    'balance', v_balance,
    'messageCount', v_message_count,
    'rewarded', v_rewarded
  );
END;
$$;
