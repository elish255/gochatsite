-- Gochati: activate accounts automatically at registration and normalize Tanzania labels.
-- Keeps the existing registration event and referral tracking behavior.
create or replace function public.gochati_create_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_username text;
  v_suffix integer := 0;
  v_referrer uuid;
  v_country text;
begin
  v_base := lower(coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(coalesce(new.email, ''), '@', 1), 'user'));
  v_base := regexp_replace(v_base, '[^a-z0-9_]', '', 'g');
  if length(v_base) < 3 then
    v_base := 'user_' || left(replace(new.id::text, '-', ''), 8);
  end if;
  v_base := left(v_base, 24);
  v_username := v_base;

  while exists (
    select 1 from public.gochati_users u
    where lower(u.username) = lower(v_username) and u.id <> new.id
  ) loop
    v_suffix := v_suffix + 1;
    v_username := left(v_base, 24 - length(v_suffix::text) - 1) || '_' || v_suffix::text;
  end loop;

  v_country := nullif(trim(new.raw_user_meta_data->>'country'), '');
  if lower(coalesce(v_country, '')) in ('tz', 'tza', '255') then
    v_country := 'Tanzania';
  end if;

  if nullif(trim(new.raw_user_meta_data->>'referral_username'), '') is not null then
    select id into v_referrer
    from public.gochati_users
    where lower(username) = lower(trim(new.raw_user_meta_data->>'referral_username'))
      and id <> new.id
    limit 1;
  end if;

  insert into public.gochati_users as existing
    (id, email, full_name, username, phone, country, referred_by, account_status, activation_paid)
  values
    (new.id, lower(new.email),
     coalesce(new.raw_user_meta_data->>'full_name', ''),
     v_username,
     coalesce(new.raw_user_meta_data->>'phone', ''),
     coalesce(v_country, ''),
     v_referrer,
     'active',
     true)
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    country = excluded.country,
    account_status = 'active',
    activation_paid = true,
    referred_by = coalesce(existing.referred_by, excluded.referred_by);

  if v_referrer is not null then
    update public.gochati_users
    set referral_count = referral_count + 1, updated_at = now()
    where id = v_referrer;
  end if;

  insert into public.gochati_admin_events(kind, user_id, username)
  values ('registration', new.id, v_username);

  return new;
end;
$$;

drop trigger if exists gochati_auth_user_created on auth.users;
create trigger gochati_auth_user_created
after insert on auth.users
for each row execute function public.gochati_create_user();

update public.gochati_users
set country = 'Tanzania'
where lower(trim(coalesce(country, ''))) in ('tz', 'tza', '255');
