-- Chatdunia-only objects: deliberately do not modify shared tables such as public.profiles.
create table if not exists public.chatdunia_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', username text not null unique,
  phone text not null default '', country text not null default '',
  account_status text not null default 'pending' check (account_status in ('pending','active','deactivated','banned')),
  activation_paid boolean not null default false,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.chatdunia_payments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.chatdunia_users(id) on delete cascade,
 order_id text unique, amount numeric(12,2) not null default 16000, currency text not null default 'TZS',
 phone text not null, status text not null default 'pending', provider_reference text,
 created_at timestamptz not null default now(), completed_at timestamptz
);
create table if not exists public.chatdunia_withdrawals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.chatdunia_users(id) on delete cascade,
 amount numeric(12,2) not null check(amount >= 100000), phone text not null,
 status text not null default 'pending' check(status in ('pending','paid','rejected')),
 created_at timestamptz not null default now(), paid_at timestamptz
);
create table if not exists public.chatdunia_notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid references public.chatdunia_users(id) on delete cascade,
 message text not null, created_at timestamptz not null default now(), read_at timestamptz
);
create table if not exists public.chatdunia_admins (
 user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now()
);
create index if not exists chatdunia_users_created_idx on public.chatdunia_users(created_at desc);
create index if not exists chatdunia_payments_user_idx on public.chatdunia_payments(user_id, created_at desc);
create index if not exists chatdunia_withdrawals_user_idx on public.chatdunia_withdrawals(user_id, created_at desc);
create index if not exists chatdunia_notifications_user_idx on public.chatdunia_notifications(user_id, created_at desc);
create or replace function public.chatdunia_is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.chatdunia_admins a where a.user_id=auth.uid()); $$;
create or replace function public.chatdunia_create_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.chatdunia_users(id,full_name,username,phone,country)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),lower(coalesce(new.raw_user_meta_data->>'username',split_part(new.email,'@',1))),coalesce(new.raw_user_meta_data->>'phone',''),coalesce(new.raw_user_meta_data->>'country',''))
 on conflict(id) do update set full_name=excluded.full_name, phone=excluded.phone, country=excluded.country;
 return new;
end; $$;
drop trigger if exists chatdunia_auth_user_created on auth.users;
create trigger chatdunia_auth_user_created after insert on auth.users for each row execute function public.chatdunia_create_user();
alter table public.chatdunia_users enable row level security;
alter table public.chatdunia_payments enable row level security;
alter table public.chatdunia_withdrawals enable row level security;
alter table public.chatdunia_notifications enable row level security;
alter table public.chatdunia_admins enable row level security;
-- Users may read their own account; status, balance and activation are only writable by admins/service role.
create policy "chatdunia user reads own account" on public.chatdunia_users for select to authenticated using(id=auth.uid() or public.chatdunia_is_admin());
create policy "chatdunia admins manage users" on public.chatdunia_users for update to authenticated using(public.chatdunia_is_admin()) with check(public.chatdunia_is_admin());
create policy "chatdunia admins read payments" on public.chatdunia_payments for select to authenticated using(user_id=auth.uid() or public.chatdunia_is_admin());
create policy "chatdunia users read own withdrawals" on public.chatdunia_withdrawals for select to authenticated using(user_id=auth.uid() or public.chatdunia_is_admin());
create policy "chatdunia users request own withdrawals" on public.chatdunia_withdrawals for insert to authenticated with check(user_id=auth.uid() and status='pending' and amount>=100000);
create policy "chatdunia admins update withdrawals" on public.chatdunia_withdrawals for update to authenticated using(public.chatdunia_is_admin()) with check(public.chatdunia_is_admin());
create policy "chatdunia read own notifications" on public.chatdunia_notifications for select to authenticated using(user_id=auth.uid() or public.chatdunia_is_admin());
create policy "chatdunia admins create notifications" on public.chatdunia_notifications for insert to authenticated with check(public.chatdunia_is_admin());
create policy "chatdunia admins read admins" on public.chatdunia_admins for select to authenticated using(user_id=auth.uid() or public.chatdunia_is_admin());
grant select, update on public.chatdunia_users to authenticated;
grant select, insert, update on public.chatdunia_withdrawals to authenticated;
grant select on public.chatdunia_payments to authenticated;
grant select, insert on public.chatdunia_notifications to authenticated;
grant select on public.chatdunia_admins to authenticated;
grant all on public.chatdunia_users, public.chatdunia_payments, public.chatdunia_withdrawals, public.chatdunia_notifications, public.chatdunia_admins to service_role;

-- Atomic withdrawal request: only active accounts with sufficient balance can request.
create or replace function public.chatdunia_request_withdrawal(p_amount numeric, p_phone text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_user public.chatdunia_users%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_amount < 100000 then raise exception 'Minimum withdrawal is TZS 100,000'; end if;
 if p_phone !~ '^[0-9+ ]{9,16}$' then raise exception 'Invalid phone number'; end if;
 select * into v_user from public.chatdunia_users where id=auth.uid() for update;
 if not found then raise exception 'Account not found'; end if;
 if v_user.account_status <> 'active' or not v_user.activation_paid then raise exception 'Account is not active'; end if;
 if v_user.balance < p_amount then raise exception 'Insufficient balance'; end if;
 update public.chatdunia_users set balance=balance-p_amount,updated_at=now() where id=auth.uid();
 insert into public.chatdunia_withdrawals(user_id,amount,phone,status) values(auth.uid(),p_amount,p_phone,'pending') returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.chatdunia_request_withdrawal(numeric,text) from public, anon;
grant execute on function public.chatdunia_request_withdrawal(numeric,text) to authenticated;
