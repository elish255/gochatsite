-- Gochati-only SplashPay migration. Does not modify shared/non-Gochati tables.
-- Stores the merchant reference in the existing unique order_id column to avoid breaking older payment history.
alter table public.gochati_payments
  add column if not exists purpose text not null default 'activation';

create index if not exists gochati_payments_status_idx
  on public.gochati_payments(status, created_at desc);
