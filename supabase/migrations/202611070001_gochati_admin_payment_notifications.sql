-- Gochati-only admin event notifications. Does not alter shared ChatDunia tables.
create table if not exists public.gochati_admin_events (
  id bigserial primary key,
  kind text not null,
  user_id uuid,
  username text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists gochati_admin_events_created_idx
  on public.gochati_admin_events(id desc);

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

  insert into public.gochati_admin_events(kind,user_id,username)
  values('registration',new.id,v_username);

  return new;
end; $$;

drop trigger if exists gochati_auth_user_created on auth.users;
create trigger gochati_auth_user_created after insert on auth.users
for each row execute function public.gochati_create_user();
