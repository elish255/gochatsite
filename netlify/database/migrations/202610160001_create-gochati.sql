CREATE TABLE gochati_admin_emails (email text PRIMARY KEY);
INSERT INTO gochati_admin_emails(email) VALUES ('yohanaelisha164@gmail.com');
CREATE TABLE gochati_users (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE, username text NOT NULL UNIQUE,
 full_name text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', country text NOT NULL DEFAULT '',
 account_status text NOT NULL DEFAULT 'pending' CHECK(account_status IN ('pending','active','deactivated','banned')),
 activation_paid boolean NOT NULL DEFAULT false, is_premium boolean NOT NULL DEFAULT false, is_vip boolean NOT NULL DEFAULT false,
 balance numeric(12,2) NOT NULL DEFAULT 0 CHECK(balance >= 0), referral_count integer NOT NULL DEFAULT 0,
 referred_by uuid REFERENCES gochati_users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE gochati_admins (user_id uuid PRIMARY KEY REFERENCES gochati_users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE gochati_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES gochati_users(id), order_id text NOT NULL UNIQUE,
 amount integer NOT NULL, currency text NOT NULL DEFAULT 'TZS' CHECK(currency='TZS'), phone text NOT NULL,
 purpose text NOT NULL CHECK(purpose IN ('activation','premium','vip')), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','success','failed','cancelled','expired','rejected','user_cancelled','unknown')),
 provider_reference text, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 CHECK ((purpose='activation' AND amount=16000) OR (purpose='premium' AND amount=32000) OR (purpose='vip' AND amount=35000))
);
CREATE UNIQUE INDEX gochati_one_pending_payment ON gochati_payments(user_id,purpose) WHERE status IN ('pending','unknown');
CREATE TABLE gochati_withdrawals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES gochati_users(id), amount numeric(12,2) NOT NULL CHECK(amount>=100000),
 phone text NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','rejected')), is_simulation boolean NOT NULL DEFAULT true CHECK(is_simulation),
 created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz
);
CREATE TABLE gochati_notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES gochati_users(id), message text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz);
CREATE TABLE chat_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES gochati_users(id), partner_id text NOT NULL, sender text NOT NULL CHECK(sender IN ('user','assistant')), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 4000), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE gochati_earning_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES gochati_users(id), partner text NOT NULL, amount integer NOT NULL CHECK(amount BETWEEN 1 AND 100000), minutes integer NOT NULL CHECK(minutes BETWEEN 1 AND 120), created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz);
CREATE UNIQUE INDEX gochati_one_earning_session ON gochati_earning_sessions(user_id) WHERE completed_at IS NULL;
CREATE TABLE gochati_admin_audit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), admin_id uuid NOT NULL REFERENCES gochati_users(id), action text NOT NULL, target_id text, changes jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX gochati_payment_history ON gochati_payments(user_id,created_at DESC);
CREATE INDEX gochati_notifications_history ON gochati_notifications(user_id,created_at DESC);
CREATE INDEX gochati_chat_history ON chat_messages(user_id,partner_id,created_at);
CREATE INDEX gochati_withdrawal_history ON gochati_withdrawals(user_id,created_at DESC);
