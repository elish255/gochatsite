begin;

create table if not exists public.gochati_admin_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 120),
  message text not null check (length(trim(message)) between 1 and 2000),
  audience text not null default 'all' check (audience in ('all','premium','normal','active','inactive')),
  status text not null default 'draft' check (status in ('draft','sent')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.gochati_admin_announcements enable row level security;
revoke all on public.gochati_admin_announcements from anon;
grant select, insert, update, delete on public.gochati_admin_announcements to authenticated;
drop policy if exists "Gochati admins read announcements" on public.gochati_admin_announcements;
drop policy if exists "Gochati admins create announcements" on public.gochati_admin_announcements;
drop policy if exists "Gochati admins update announcements" on public.gochati_admin_announcements;
drop policy if exists "Gochati admins delete announcements" on public.gochati_admin_announcements;
create policy "Gochati admins read announcements" on public.gochati_admin_announcements
  for select to authenticated using (public.gochati_is_admin());
create policy "Gochati admins create announcements" on public.gochati_admin_announcements
  for insert to authenticated with check (public.gochati_is_admin() and created_by = auth.uid());
create policy "Gochati admins update announcements" on public.gochati_admin_announcements
  for update to authenticated using (public.gochati_is_admin()) with check (public.gochati_is_admin());
create policy "Gochati admins delete announcements" on public.gochati_admin_announcements
  for delete to authenticated using (public.gochati_is_admin());

create table if not exists public.gochati_payment_numbers (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('M-Pesa','Tigo Pesa','Airtel Money','HaloPesa','Mixx by Yas')),
  number text not null check (length(trim(number)) between 3 and 32),
  display_name text not null default '',
  instructions text not null default '',
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique (provider, number)
);
alter table public.gochati_payment_numbers drop constraint if exists gochati_payment_numbers_provider_check;
alter table public.gochati_payment_numbers add constraint gochati_payment_numbers_provider_check
  check (provider in ('M-Pesa','Tigo Pesa','Airtel Money','HaloPesa','Mixx by Yas'));

alter table public.gochati_payment_numbers enable row level security;
revoke all on public.gochati_payment_numbers from anon;
grant select, insert, update, delete on public.gochati_payment_numbers to authenticated;
drop policy if exists "Gochati admins manage payment numbers" on public.gochati_payment_numbers;
create policy "Gochati admins manage payment numbers" on public.gochati_payment_numbers
  for all to authenticated using (public.gochati_is_admin()) with check (public.gochati_is_admin());

create table if not exists public.gochati_presence_sessions (
  visitor_id uuid primary key,
  user_id uuid references public.gochati_users(id) on delete set null,
  country text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists gochati_presence_sessions_last_seen_idx
  on public.gochati_presence_sessions (last_seen_at desc);
create index if not exists gochati_presence_sessions_country_seen_idx
  on public.gochati_presence_sessions (country, last_seen_at desc);

alter table public.gochati_presence_sessions enable row level security;
revoke all on public.gochati_presence_sessions from anon, authenticated;
grant select on public.gochati_presence_sessions to authenticated;
grant select, insert, update, delete on public.gochati_presence_sessions to service_role;
drop policy if exists "Gochati admins read presence sessions" on public.gochati_presence_sessions;
create policy "Gochati admins read presence sessions" on public.gochati_presence_sessions
  for select to authenticated using (public.gochati_is_admin());

create table if not exists public.gochati_user_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.gochati_users(id) on delete cascade,
  subscription jsonb not null check (subscription ? 'endpoint' and subscription ? 'keys'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists gochati_user_push_subscriptions_endpoint_idx
  on public.gochati_user_push_subscriptions (user_id, ((subscription->>'endpoint')));
alter table public.gochati_user_push_subscriptions enable row level security;
revoke all on public.gochati_user_push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.gochati_user_push_subscriptions to service_role;

commit;
