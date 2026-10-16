ALTER TABLE gochati_withdrawals ADD COLUMN fee numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE gochati_withdrawals ADD COLUMN net_amount numeric(12,2);
UPDATE gochati_withdrawals SET net_amount=amount;
ALTER TABLE gochati_withdrawals ALTER COLUMN net_amount SET NOT NULL;
ALTER TABLE gochati_withdrawals ADD CONSTRAINT withdrawal_fee_valid CHECK (fee >= 0 AND net_amount >= 0 AND net_amount + fee = amount);
ALTER TABLE gochati_payments DROP CONSTRAINT gochati_payments_check;
ALTER TABLE gochati_payments ADD CONSTRAINT gochati_payments_check CHECK ((purpose='activation' AND amount=16000) OR (purpose='premium' AND amount=32000) OR (purpose='vip' AND amount IN (35000,35500)));
