-- Preserve lifetime income when earlier balance adjustments were not included.
-- Withdrawal requests already debit balance, including requests still pending.
UPDATE gochati_users u
SET net_income = GREATEST(
  u.net_income,
  u.balance + COALESCE((SELECT SUM(w.amount) FROM gochati_withdrawals w WHERE w.user_id = u.id), 0)
);
