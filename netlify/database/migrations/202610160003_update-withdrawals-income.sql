ALTER TABLE gochati_withdrawals DROP CONSTRAINT gochati_withdrawals_amount_check;
ALTER TABLE gochati_withdrawals ADD CONSTRAINT gochati_withdrawals_amount_check CHECK (amount > 20000);
ALTER TABLE gochati_users ADD COLUMN net_income numeric(12,2) NOT NULL DEFAULT 0 CHECK (net_income >= 0);
UPDATE gochati_users u SET net_income = COALESCE((SELECT SUM(amount) FROM gochati_earning_sessions s WHERE s.user_id=u.id AND s.completed_at IS NOT NULL),0);
