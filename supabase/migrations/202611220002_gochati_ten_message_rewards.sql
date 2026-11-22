begin;

alter table public.gochati_exchange_sessions
  add column message_count integer not null default 0 check (message_count >= 0),
  add column reward_paid_at timestamptz;

update public.gochati_exchange_sessions as sessions
set message_count = existing.exchange_count,
    reward_paid_at = now(),
    status = 'completed'
from (
  select session_id, count(*)::integer as exchange_count
  from public.gochati_chat_exchanges
  group by session_id
) as existing
where sessions.id = existing.session_id;

drop function if exists public.gochati_complete_chat_exchange(uuid, uuid, uuid, text);

create function public.gochati_complete_chat_exchange(
  p_user_id uuid,
  p_session_id uuid,
  p_exchange_id uuid,
  p_partner text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.gochati_exchange_sessions%rowtype;
  v_user public.gochati_users%rowtype;
  v_inserted integer;
  v_balance numeric(12,2);
  v_message_count integer;
  v_rewarded boolean := false;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required';
  end if;

  select * into v_session
  from public.gochati_exchange_sessions
  where id = p_session_id
  for update;

  if not found
    or v_session.user_id <> p_user_id
    or v_session.partner_id <> p_partner
    or v_session.status <> 'active'
    or v_session.expires_at <= now()
  then
    raise exception 'Exchange session is invalid or expired';
  end if;

  select * into v_user
  from public.gochati_users
  where id = p_user_id
  for update;

  if not found or v_user.account_status <> 'active' or not v_user.activation_paid then
    raise exception 'Account is not active';
  end if;

  insert into public.gochati_chat_exchanges(session_id, exchange_id, user_id, amount)
  values (v_session.id, p_exchange_id, p_user_id, v_session.amount)
  on conflict (session_id, exchange_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return jsonb_build_object(
      'balance', v_user.balance,
      'messageCount', v_session.message_count,
      'rewarded', false
    );
  end if;

  update public.gochati_exchange_sessions
  set message_count = message_count + 1
  where id = v_session.id
  returning message_count into v_message_count;

  if v_message_count >= 10 and v_session.reward_paid_at is null then
    update public.gochati_users
    set balance = balance + v_session.amount, updated_at = now()
    where id = p_user_id
    returning balance into v_balance;

    update public.gochati_exchange_sessions
    set reward_paid_at = now(), status = 'completed'
    where id = v_session.id;
    v_rewarded := true;
  else
    v_balance := v_user.balance;
  end if;

  return jsonb_build_object(
    'balance', v_balance,
    'messageCount', v_message_count,
    'rewarded', v_rewarded
  );
end;
$$;

revoke all on function public.gochati_complete_chat_exchange(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.gochati_complete_chat_exchange(uuid, uuid, uuid, text) to service_role;

commit;
