CREATE TABLE gochati_auth_limits (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL
);
CREATE INDEX gochati_auth_limits_expiry ON gochati_auth_limits(expires_at);
