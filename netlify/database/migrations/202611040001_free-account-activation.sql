-- Keep the legacy entitlement flag for compatibility; no payment is recorded.
ALTER TABLE gochati_users ALTER COLUMN account_status SET DEFAULT 'active';
ALTER TABLE gochati_users ALTER COLUMN activation_paid SET DEFAULT true;

-- Activate existing registrations awaiting payment without restoring suspended accounts.
UPDATE gochati_users
SET account_status = 'active', activation_paid = true, updated_at = now()
WHERE account_status IN ('pending', 'active');
