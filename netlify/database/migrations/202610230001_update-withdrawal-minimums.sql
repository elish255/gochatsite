ALTER TABLE gochati_withdrawals DROP CONSTRAINT IF EXISTS gochati_withdrawals_amount_check;
ALTER TABLE gochati_withdrawals ADD CONSTRAINT gochati_withdrawals_amount_check CHECK (amount>=100000);
