CREATE FUNCTION gochati_normalize_phone(value text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 WITH cleaned AS (SELECT regexp_replace(regexp_replace(value,'[^0-9]','','g'),'^00','') AS digits)
 SELECT CASE WHEN digits ~ '^0[0-9]{9}$' THEN '255' || substring(digits from 2)
 WHEN digits ~ '^[67][0-9]{8}$' THEN '255' || digits
 WHEN digits ~ '^2550[0-9]{9}$' THEN '255' || substring(digits from 5)
 ELSE digits END FROM cleaned
$$;
CREATE TABLE gochati_phone_bans (
 phone text PRIMARY KEY, reason text NOT NULL DEFAULT '', admin_id uuid REFERENCES gochati_users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION gochati_enforce_phone_ban() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(gochati_normalize_phone(NEW.phone),0));
 IF EXISTS (SELECT 1 FROM gochati_phone_bans WHERE phone=gochati_normalize_phone(NEW.phone)) THEN
 RAISE EXCEPTION 'Phone registration is blocked' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER gochati_block_banned_signup BEFORE INSERT OR UPDATE OF phone ON gochati_users FOR EACH ROW EXECUTE FUNCTION gochati_enforce_phone_ban();
CREATE TABLE gochati_support_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES gochati_users(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES gochati_users(id) ON DELETE CASCADE, sender text NOT NULL CHECK(sender IN ('user','admin')),
 body text NOT NULL DEFAULT '' CHECK(length(body)<=4000), kind text NOT NULL DEFAULT 'text' CHECK(kind IN ('text','image','audio')),
 blob_key text, mime text, created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz,
 CHECK ((kind='text' AND length(trim(body))>0 AND blob_key IS NULL) OR (kind IN ('image','audio') AND blob_key IS NOT NULL))
);
CREATE INDEX gochati_support_history ON gochati_support_messages(user_id,created_at DESC,id);
CREATE TABLE gochati_admin_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, kind text NOT NULL, user_id uuid REFERENCES gochati_users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz
);
CREATE TABLE gochati_push_config (id integer PRIMARY KEY CHECK(id=1), public_key text NOT NULL, private_key text NOT NULL);
CREATE TABLE gochati_push_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), admin_id uuid NOT NULL REFERENCES gochati_users(id) ON DELETE CASCADE,
 endpoint text NOT NULL UNIQUE, subscription jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE gochati_push_deliveries (
 event_id bigint REFERENCES gochati_admin_events(id) ON DELETE CASCADE,
 subscription_id uuid REFERENCES gochati_push_subscriptions(id) ON DELETE CASCADE,
 delivered_at timestamptz, attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(event_id,subscription_id)
);
CREATE FUNCTION gochati_customer_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE new_event_id bigint;
BEGIN
 IF TG_TABLE_NAME='gochati_users' THEN
   INSERT INTO gochati_admin_events(kind,user_id) VALUES ('registration',NEW.id) RETURNING id INTO new_event_id;
 ELSE
   IF NEW.sender <> 'user' THEN RETURN NEW; END IF;
   INSERT INTO gochati_admin_events(kind,user_id) VALUES ('support',NEW.user_id) RETURNING id INTO new_event_id;
 END IF;
 INSERT INTO gochati_push_deliveries(event_id,subscription_id) SELECT new_event_id,id FROM gochati_push_subscriptions;
 RETURN NEW;
END $$;
CREATE TRIGGER gochati_registration_event AFTER INSERT ON gochati_users FOR EACH ROW EXECUTE FUNCTION gochati_customer_event();
CREATE TRIGGER gochati_support_event AFTER INSERT ON gochati_support_messages FOR EACH ROW EXECUTE FUNCTION gochati_customer_event();
