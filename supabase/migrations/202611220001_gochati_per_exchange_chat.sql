begin;

create table public.gochati_exchange_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.gochati_users(id) on delete cascade,
  partner_id text not null check (partner_id ~ '^person-[1-9][0-9]*$'),
  amount numeric(12,2) not null check (amount in (48500, 42500, 42000, 44500, 53000, 45500, 45000, 41000, 50500, 49500, 52000)),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 hours'),
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled'))
);

create index gochati_exchange_sessions_user_idx
  on public.gochati_exchange_sessions(user_id, started_at desc);

alter table public.gochati_exchange_sessions enable row level security;
revoke all on public.gochati_exchange_sessions from anon, authenticated;
grant select on public.gochati_exchange_sessions to authenticated;
grant all on public.gochati_exchange_sessions to service_role;
drop policy if exists gochati_exchange_sessions_select_own on public.gochati_exchange_sessions;
create policy gochati_exchange_sessions_select_own
  on public.gochati_exchange_sessions for select to authenticated
  using (user_id = (select auth.uid()));

create table public.gochati_chat_exchanges (
  session_id uuid not null references public.gochati_exchange_sessions(id) on delete cascade,
  exchange_id uuid not null,
  user_id uuid not null references public.gochati_users(id) on delete cascade,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now(),
  primary key (session_id, exchange_id)
);

alter table public.gochati_chat_exchanges enable row level security;
revoke all on public.gochati_chat_exchanges from anon, authenticated;
grant all on public.gochati_chat_exchanges to service_role;

create or replace function public.gochati_start_exchange_session(p_partner text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person_index integer;
  v_prices numeric[] := array[48500, 42500, 42000, 44500, 53000, 45500, 45000, 41000, 48500, 50500, 49500, 52000];
  v_amount numeric(12,2);
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;

  v_person_index := substring(coalesce(p_partner, '') from '^person-([0-9]+)$')::integer;
  if v_person_index is null or v_person_index not between 1 and 52 then
    raise exception 'Chat partner is invalid';
  end if;

  if not exists (
    select 1 from public.gochati_users
    where id = (select auth.uid()) and account_status = 'active' and activation_paid
  ) then
    raise exception 'Account is not active';
  end if;

  v_amount := v_prices[((v_person_index - 1) % cardinality(v_prices)) + 1];
  insert into public.gochati_exchange_sessions(user_id, partner_id, amount)
  values ((select auth.uid()), p_partner, v_amount)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.gochati_start_exchange_session(text) from public, anon;
grant execute on function public.gochati_start_exchange_session(text) to authenticated;

create or replace function public.gochati_complete_chat_exchange(
  p_user_id uuid,
  p_session_id uuid,
  p_exchange_id uuid,
  p_partner text
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.gochati_exchange_sessions%rowtype;
  v_user public.gochati_users%rowtype;
  v_inserted integer;
  v_balance numeric(12,2);
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
    return v_user.balance;
  end if;

  update public.gochati_users
  set balance = balance + v_session.amount, updated_at = now()
  where id = p_user_id
  returning balance into v_balance;

  return v_balance;
end;
$$;

revoke all on function public.gochati_complete_chat_exchange(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.gochati_complete_chat_exchange(uuid, uuid, uuid, text) to service_role;

commit;
