-- Gochati premium flag; isolated from all other site tables.
alter table public.gochati_users add column if not exists is_premium boolean not null default false;
