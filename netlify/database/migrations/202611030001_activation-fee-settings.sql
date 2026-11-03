CREATE TABLE gochati_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  activation_fee integer NOT NULL DEFAULT 16000 CHECK (activation_fee BETWEEN 1 AND 10000000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO gochati_settings(id) VALUES(true);
ALTER TABLE gochati_payments DROP CONSTRAINT gochati_payments_check;
ALTER TABLE gochati_payments ADD CONSTRAINT gochati_payments_check CHECK (
  (purpose='activation' AND amount BETWEEN 1 AND 10000000 AND amount=trunc(amount))
  OR (purpose='premium' AND amount=32000)
  OR (purpose='vip' AND amount IN (35000,35500))
);
