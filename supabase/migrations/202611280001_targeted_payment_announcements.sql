begin;

alter table public.gochati_notifications
  add column if not exists title text,
  add column if not exists payment_amount integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.gochati_notifications'::regclass
      and conname = 'gochati_notifications_payment_amount_check'
  ) then
    alter table public.gochati_notifications
      add constraint gochati_notifications_payment_amount_check
      check (payment_amount is null or payment_amount between 100 and 10000000);
  end if;
end;
$$;

alter table public.gochati_admin_announcements
  add column if not exists target_user_id uuid references public.gochati_users(id) on delete set null,
  add column if not exists payment_amount integer;

alter table public.gochati_admin_announcements
  drop constraint if exists gochati_admin_announcements_audience_check;
alter table public.gochati_admin_announcements
  add constraint gochati_admin_announcements_audience_check
  check (audience in ('all', 'premium', 'normal', 'active', 'inactive', 'individual'));

create or replace function public.gochati_send_targeted_announcement(
  p_target_user_id uuid,
  p_title text,
  p_message text,
  p_payment_amount integer default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if auth.uid() is null or not public.gochati_is_admin() then
    raise exception 'Admin pekee ndiye anaruhusiwa kutuma tangazo.';
  end if;

  if p_target_user_id is null or not exists (
    select 1 from public.gochati_users where id = p_target_user_id
  ) then
    raise exception 'Mtumiaji hajapatikana.';
  end if;

  if p_title is null or length(trim(p_title)) not between 1 and 120
    or p_message is null or length(trim(p_message)) not between 1 and 2000 then
    raise exception 'Kichwa au ujumbe si sahihi.';
  end if;

  if p_payment_amount is not null and p_payment_amount not between 100 and 10000000 then
    raise exception 'Kiasi cha VIP lazima kiwe TZS 100 hadi 10,000,000.';
  end if;

  if p_payment_amount is not null then
    update public.gochati_users
      set vip_amount_override = p_payment_amount
      where id = p_target_user_id;
  end if;

  insert into public.gochati_notifications (user_id, title, message, payment_amount)
    values (p_target_user_id, trim(p_title), trim(p_message), p_payment_amount);

  insert into public.gochati_admin_announcements (
    title, message, audience, status, created_by, created_at, sent_at, target_user_id, payment_amount
  ) values (
    trim(p_title), trim(p_message), 'individual', 'sent', auth.uid(), now(), now(), p_target_user_id, p_payment_amount
  );

  get diagnostics inserted_count = row_count;
  return 1;
end;
$$;

revoke all on function public.gochati_send_targeted_announcement(uuid, text, text, integer) from public, anon;
grant execute on function public.gochati_send_targeted_announcement(uuid, text, text, integer) to authenticated;

commit;
