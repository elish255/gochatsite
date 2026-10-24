ALTER TABLE gochati_withdrawals DROP CONSTRAINT IF EXISTS gochati_withdrawals_amount_check;
-- Preserve historical withdrawals accepted under the previous minimum. Raising
-- their amounts would rewrite history and break the fee/net_amount invariant.
-- NOT VALID skips the existing-row scan but enforces the minimum on all future
-- inserts and updates (including updates to historical withdrawals).
ALTER TABLE gochati_withdrawals ADD CONSTRAINT gochati_withdrawals_amount_check CHECK (amount>=100000) NOT VALID;
