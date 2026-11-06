-- Gochati-only migration. Does not alter shared tables used by other sites.
-- Persists the earnings event and returns the authoritative new balance.
create or replace function public.gochati_credit_earning(p_amount numeric)
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
  -- Only amounts configured by the current Gochati session menu are accepted.
  if p_amount not in (5000, 25000, 30000, 67000, 120000, 150000) then
    raise exception 'Invalid Gochati earning amount';
  end if;
  update public.gochati_users
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
revoke all on function public.gochati_credit_earning(numeric) from public, anon;
grant execute on function public.gochati_credit_earning(numeric) to authenticated;
