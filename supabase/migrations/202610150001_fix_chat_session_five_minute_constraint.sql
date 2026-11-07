-- The app offers a 5-minute paid session for TZS 25,000.
-- Keep the legacy 10-minute option valid as well.
alter table public.gochati_chat_sessions
  drop constraint if exists gochati_chat_sessions_check;

alter table public.gochati_chat_sessions
  add constraint gochati_chat_sessions_check
  check ((duration_minutes, amount) in (
    (1,5000),
    (5,25000),
    (10,25000),
    (20,30000),
    (45,67000),
    (60,120000),
    (120,150000)
  ));
