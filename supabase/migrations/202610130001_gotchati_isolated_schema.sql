-- Gotchati isolated schema bootstrap. Uses only gotchati_* objects and leaves shared/Chatdunia objects untouched.
-- Gotchati-only objects: deliberately do not modify shared tables such as public.profiles.
create table if not exists public.gotchati_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', username text not null unique,
  phone text not null default '', country text not null default '',
  account_status text not null default 'pending' check (account_status in ('pending','active','deactivated','banned')),
  activation_paid boolean not null default false,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.gotchati_payments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.gotchati_users(id) on delete cascade,
 order_id text unique, amount numeric(12,2) not null default 16000, currency text not null default 'TZS',
 phone text not null, status text not null default 'pending', provider_reference text,
 created_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.gotchati_withdrawals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.gotchati_users(id) on delete cascade,
 amount numeric(12,2) not null check(amount >= 100000), phone text not null,
 status text not null default 'pending' check(status in ('pending','paid','rejected')),
 created_at timestamptz not null default now(), paid_at timestamptz
);
create table if not exists public.gotchati_notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid references public.gotchati_users(id) on delete cascade,
 message text not null, created_at timestamptz not null default now(), read_at timestamptz
);
create table if not exists public.gotchati_admins (
 user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now()
);
create index if not exists gotchati_users_created_idx on public.gotchati_users(created_at desc);
create index if not exists gotchati_payments_user_idx on public.gotchati_payments(user_id, created_at desc);
create index if not exists gotchati_withdrawals_user_idx on public.gotchati_withdrawals(user_id, created_at desc);
create index if not exists gotchati_notifications_user_idx on public.gotchati_notifications(user_id, created_at desc);
create or replace function public.gotchati_is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.gotchati_admins a where a.user_id=auth.uid()); $$;
create or replace function public.gotchati_create_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.gotchati_users(id,full_name,username,phone,country)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),lower(coalesce(new.raw_user_meta_data->>'username',split_part(new.email,'@',1))),coalesce(new.raw_user_meta_data->>'phone',''),coalesce(new.raw_user_meta_data->>'country',''))
 on conflict(id) do update set full_name=excluded.full_name, phone=excluded.phone, country=excluded.country;
 return new;
end; $$;
drop trigger if exists gotchati_auth_user_created on auth.users;
create trigger gotchati_auth_user_created after insert on auth.users for each row execute function public.gotchati_create_user();
alter table public.gotchati_users enable row level security;
alter table public.gotchati_payments enable row level security;
alter table public.gotchati_withdrawals enable row level security;
alter table public.gotchati_notifications enable row level security;
alter table public.gotchati_admins enable row level security;
-- Users may read their own account; status, balance and activation are only writable by admins/service role.
drop policy if exists "Gotchati user reads own account" on public.gotchati_users;
create policy "Gotchati user reads own account" on public.gotchati_users for select to authenticated using(id=auth.uid() or public.gotchati_is_admin());
drop policy if exists "Gotchati admins manage users" on public.gotchati_users;
create policy "Gotchati admins manage users" on public.gotchati_users for update to authenticated using(public.gotchati_is_admin()) with check(public.gotchati_is_admin());
drop policy if exists "Gotchati admins read payments" on public.gotchati_payments;
create policy "Gotchati admins read payments" on public.gotchati_payments for select to authenticated using(user_id=auth.uid() or public.gotchati_is_admin());
drop policy if exists "Gotchati users read own withdrawals" on public.gotchati_withdrawals;
create policy "Gotchati users read own withdrawals" on public.gotchati_withdrawals for select to authenticated using(user_id=auth.uid() or public.gotchati_is_admin());
drop policy if exists "Gotchati users request own withdrawals" on public.gotchati_withdrawals;
create policy "Gotchati users request own withdrawals" on public.gotchati_withdrawals for insert to authenticated with check(user_id=auth.uid() and status='pending' and amount>=100000);
drop policy if exists "Gotchati admins update withdrawals" on public.gotchati_withdrawals;
create policy "Gotchati admins update withdrawals" on public.gotchati_withdrawals for update to authenticated using(public.gotchati_is_admin()) with check(public.gotchati_is_admin());
drop policy if exists "Gotchati read own notifications" on public.gotchati_notifications;
create policy "Gotchati read own notifications" on public.gotchati_notifications for select to authenticated using(user_id=auth.uid() or public.gotchati_is_admin());
drop policy if exists "Gotchati admins create notifications" on public.gotchati_notifications;
create policy "Gotchati admins create notifications" on public.gotchati_notifications for insert to authenticated with check(public.gotchati_is_admin());
drop policy if exists "Gotchati admins read admins" on public.gotchati_admins;
create policy "Gotchati admins read admins" on public.gotchati_admins for select to authenticated using(user_id=auth.uid() or public.gotchati_is_admin());
grant select, update on public.gotchati_users to authenticated;
grant select, insert, update on public.gotchati_withdrawals to authenticated;
grant select on public.gotchati_payments to authenticated;
grant select, insert on public.gotchati_notifications to authenticated;
grant select on public.gotchati_admins to authenticated;
grant all on public.gotchati_users, public.gotchati_payments, public.gotchati_withdrawals, public.gotchati_notifications, public.gotchati_admins to service_role;

-- Atomic withdrawal request: only active accounts with sufficient balance can request.
create or replace function public.gotchati_request_withdrawal(p_amount numeric, p_phone text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_user public.gotchati_users%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_amount < 100000 then raise exception 'Minimum withdrawal is TZS 100,000'; end if;
 if p_phone !~ '^[0-9+ ]{9,16}$' then raise exception 'Invalid phone number'; end if;
 select * into v_user from public.gotchati_users where id=auth.uid() for update;
 if not found then raise exception 'Account not found'; end if;
 if v_user.account_status <> 'active' or not v_user.activation_paid then raise exception 'Account is not active'; end if;
 if v_user.balance < p_amount then raise exception 'Insufficient balance'; end if;
 update public.gotchati_users set balance=balance-p_amount,updated_at=now() where id=auth.uid();
 insert into public.gotchati_withdrawals(user_id,amount,phone,status) values(auth.uid(),p_amount,p_phone,'pending') returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.gotchati_request_withdrawal(numeric,text) from public, anon;
grant execute on function public.gotchati_request_withdrawal(numeric,text) to authenticated;
-- Gotchati premium flag; isolated from all other site tables.
alter table public.gotchati_users add column if not exists is_premium boolean not null default false;
-- Gotchati-only migration. Does not alter shared tables used by other sites.
-- Persists the earnings event and returns the authoritative new balance.
create or replace function public.gotchati_credit_earning(p_amount numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric(12,2);
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  -- Only amounts configured by the current Gotchati session menu are accepted.
  if p_amount not in (5000, 25000, 30000, 67000, 120000, 150000) then
    raise exception 'Invalid Gotchati earning amount';
  end if;
  update public.gotchati_users
     set balance = balance + p_amount,
         updated_at = now()
   where id = auth.uid()
     and account_status = 'active'
  returning balance into v_balance;
  if not found then
    raise exception 'Account is not active';
  end if;
  return v_balance;
end;
$$;
revoke all on function public.gotchati_credit_earning(numeric) from public, anon;
grant execute on function public.gotchati_credit_earning(numeric) to authenticated;
-- Repair Gotchati signup trigger without touching shared tables.
-- Avoids HTTP 500 when a requested username is already taken.
create or replace function public.gotchati_create_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_username text;
  v_suffix integer := 0;
begin
  v_base := lower(coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(coalesce(new.email, ''), '@', 1), 'user'));
  v_base := regexp_replace(v_base, '[^a-z0-9_]', '', 'g');
  if length(v_base) < 3 then v_base := 'user_' || left(replace(new.id::text, '-', ''), 8); end if;
  v_base := left(v_base, 24);
  v_username := v_base;

  while exists (select 1 from public.gotchati_users u where u.username = v_username and u.id <> new.id) loop
    v_suffix := v_suffix + 1;
    v_username := left(v_base, 24 - length(v_suffix::text) - 1) || '_' || v_suffix::text;
  end loop;

  insert into public.gotchati_users(id, full_name, username, phone, country)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), v_username, coalesce(new.raw_user_meta_data->>'phone', ''), coalesce(new.raw_user_meta_data->>'country', ''))
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    country = excluded.country;
  return new;
end;
$$;

drop trigger if exists gotchati_auth_user_created on auth.users;
create trigger gotchati_auth_user_created
after insert on auth.users
for each row execute function public.gotchati_create_user();
