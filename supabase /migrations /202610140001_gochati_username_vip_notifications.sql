-- GOCHATI-only extension. All objects are namespaced; shared tables are not modified.
alter table public.gochati_users add column if not exists email text;
alter table public.gochati_users add column if not exists is_vip boolean not null default false;
alter table public.gochati_users add column if not exists referral_count integer not null default 0;
alter table public.gochati_users add column if not exists referred_by uuid references public.gochati_users(id) on delete set null;

create index if not exists gochati_users_username_lower_idx on public.gochati_users(lower(username));

create or replace function public.gochati_create_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_base text;
  v_username text;
  v_suffix integer := 0;
  v_referrer uuid;
begin
  v_base := lower(coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(coalesce(new.email, ''), '@', 1), 'user'));
  v_base := regexp_replace(v_base, '[^a-z0-9_]', '', 'g');
  if length(v_base) < 3 then v_base := 'user_' || left(replace(new.id::text, '-', ''), 8); end if;
  v_base := left(v_base, 24);
  v_username := v_base;
  while exists (select 1 from public.gochati_users u where lower(u.username)=lower(v_username) and u.id <> new.id) loop
    v_suffix := v_suffix + 1;
    v_username := left(v_base, 24 - length(v_suffix::text) - 1) || '_' || v_suffix::text;
  end loop;

  if nullif(trim(new.raw_user_meta_data->>'referral_username'), '') is not null then
    select id into v_referrer from public.gochati_users
    where lower(username)=lower(trim(new.raw_user_meta_data->>'referral_username')) and id <> new.id limit 1;
  end if;

  insert into public.gochati_users as existing(id,email,full_name,username,phone,country,referred_by)
  values(new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name',''), v_username,
    coalesce(new.raw_user_meta_data->>'phone',''), coalesce(new.raw_user_meta_data->>'country',''), v_referrer)
  on conflict(id) do update set email=excluded.email, full_name=excluded.full_name, phone=excluded.phone,
    country=excluded.country, referred_by=coalesce(existing.referred_by, excluded.referred_by);

  if v_referrer is not null then
    update public.gochati_users set referral_count=referral_count+1, updated_at=now() where id=v_referrer;
  end if;
  return new;
end; $$;

drop trigger if exists gochati_auth_user_created on auth.users;
create trigger gochati_auth_user_created after insert on auth.users for each row execute function public.gochati_create_user();

-- Existing accounts get the email from Supabase Auth, without changing any other site's data.
update public.gochati_users u set email=lower(a.email)
from auth.users a where a.id=u.id and (u.email is null or u.email='');

-- Users can dismiss their own notifications; admin remains the only sender.
drop policy if exists "Gochati users dismiss own notifications" on public.gochati_notifications;
create policy "Gochati users dismiss own notifications" on public.gochati_notifications
for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant update on public.gochati_notifications to authenticated;

create or replace function public.gochati_request_withdrawal(p_amount numeric, p_phone text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_user public.gochati_users%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_amount < 100000 then raise exception 'Minimum withdrawal is TZS 100,000'; end if;
 if p_phone !~ '^[0-9+ ]{9,16}$' then raise exception 'Invalid phone number'; end if;
 select * into v_user from public.gochati_users where id=auth.uid() for update;
 if not found then raise exception 'Account not found'; end if;
 if v_user.account_status <> 'active' or not v_user.activation_paid then raise exception 'Account is not active'; end if;
 if not v_user.is_premium then raise exception 'Premium account required'; end if;
 if not v_user.is_vip and coalesce(v_user.referral_count,0) < 20 then raise exception 'VIP upgrade or 20 referrals required'; end if;
 if v_user.balance < p_amount then raise exception 'Insufficient balance'; end if;
 update public.gochati_users set balance=balance-p_amount,updated_at=now() where id=auth.uid();
 insert into public.gochati_withdrawals(user_id,amount,phone,status) values(auth.uid(),p_amount,p_phone,'pending') returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.gochati_request_withdrawal(numeric,text) from public, anon;
grant execute on function public.gochati_request_withdrawal(numeric,text) to authenticated;

-- Server-enforced paid chat sessions. Client countdown alone cannot credit a balance.
create table if not exists public.gochati_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.gochati_users(id) on delete cascade,
  partner_id text not null,
  amount numeric(12,2) not null,
  duration_minutes integer not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'active' check(status in ('active','completed','cancelled')),
  check ((duration_minutes, amount) in ((1,5000),(10,25000),(20,30000),(45,67000),(60,120000),(120,150000)))
);
create index if not exists gochati_chat_sessions_user_idx on public.gochati_chat_sessions(user_id, started_at desc);
alter table public.gochati_chat_sessions enable row level security;
drop policy if exists "Gochati users read own chat sessions" on public.gochati_chat_sessions;
create policy "Gochati users read own chat sessions" on public.gochati_chat_sessions for select to authenticated using(user_id=auth.uid() or public.gochati_is_admin());
grant select on public.gochati_chat_sessions to authenticated;
grant all on public.gochati_chat_sessions to service_role;

create or replace function public.gochati_start_earning_session(p_amount numeric, p_minutes integer, p_partner text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if not exists(select 1 from public.gochati_users where id=auth.uid() and account_status='active' and activation_paid) then raise exception 'Account is not active'; end if;
 if not ((p_minutes,p_amount) in ((1,5000),(10,25000),(20,30000),(45,67000),(60,120000),(120,150000))) then raise exception 'Invalid session duration or amount'; end if;
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
 where id=auth.uid() and account_status='active' and activation_paid returning balance into v_balance;
 if not found then raise exception 'Account is not active'; end if;
 update public.gochati_chat_sessions set status='completed',completed_at=now() where id=v_session.id;
 return v_balance;
end; $$;
revoke all on function public.gochati_complete_earning_session(uuid) from public, anon;
grant execute on function public.gochati_complete_earning_session(uuid) to authenticated;
revoke all on function public.gochati_credit_earning(numeric) from public, anon, authenticated;
