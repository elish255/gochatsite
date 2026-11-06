-- Repair Gochati signup trigger without touching shared tables.
-- Avoids HTTP 500 when a requested username is already taken.
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
begin
  v_base := lower(coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(coalesce(new.email, ''), '@', 1), 'user'));
  v_base := regexp_replace(v_base, '[^a-z0-9_]', '', 'g');
  if length(v_base) < 3 then v_base := 'user_' || left(replace(new.id::text, '-', ''), 8); end if;
  v_base := left(v_base, 24);
  v_username := v_base;

  while exists (select 1 from public.gochati_users u where u.username = v_username and u.id <> new.id) loop
    v_suffix := v_suffix + 1;
    v_username := left(v_base, 24 - length(v_suffix::text) - 1) || '_' || v_suffix::text;
  end loop;

  insert into public.gochati_users(id, full_name, username, phone, country)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), v_username, coalesce(new.raw_user_meta_data->>'phone', ''), coalesce(new.raw_user_meta_data->>'country', ''))
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    country = excluded.country;
  return new;
end;
$$;

drop trigger if exists gochati_auth_user_created on auth.users;
create trigger gochati_auth_user_created
after insert on auth.users
for each row execute function public.gochati_create_user();
