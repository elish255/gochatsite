-- Tie each support alert to its message so reading a conversation also clears its alerts.
ALTER TABLE gochati_admin_events ADD COLUMN message_id uuid REFERENCES gochati_support_messages(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX gochati_admin_event_message ON gochati_admin_events(message_id);

-- Trigger-created messages and alerts share their transaction timestamp.
-- Pair historical rows without duplicating alerts already shown to the admin.
WITH messages AS (
 SELECT id,user_id,created_at,row_number() OVER (PARTITION BY user_id,created_at ORDER BY id) AS position
 FROM gochati_support_messages WHERE sender='user'
), events AS (
 SELECT id,user_id,created_at,row_number() OVER (PARTITION BY user_id,created_at ORDER BY id) AS position
 FROM gochati_admin_events WHERE kind='support'
)
UPDATE gochati_admin_events e SET message_id=m.id FROM events old, messages m
WHERE e.id=old.id AND old.user_id=m.user_id AND old.created_at=m.created_at AND old.position=m.position;
UPDATE gochati_admin_events e SET read_at=m.read_at FROM gochati_support_messages m
WHERE e.message_id=m.id AND e.read_at IS NULL AND m.read_at IS NOT NULL;
INSERT INTO gochati_admin_events(kind,user_id,message_id,created_at)
SELECT 'support',m.user_id,m.id,m.created_at FROM gochati_support_messages m
WHERE m.sender='user' AND m.read_at IS NULL
AND NOT EXISTS (SELECT 1 FROM gochati_admin_events e WHERE e.message_id=m.id);

CREATE OR REPLACE FUNCTION gochati_customer_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE new_event_id bigint;
BEGIN
 IF TG_TABLE_NAME='gochati_users' THEN
   INSERT INTO gochati_admin_events(kind,user_id) VALUES ('registration',NEW.id) RETURNING id INTO new_event_id;
 ELSE
   IF NEW.sender <> 'user' THEN RETURN NEW; END IF;
   INSERT INTO gochati_admin_events(kind,user_id,message_id) VALUES ('support',NEW.user_id,NEW.id) RETURNING id INTO new_event_id;
 END IF;
 INSERT INTO gochati_push_deliveries(event_id,subscription_id) SELECT new_event_id,id FROM gochati_push_subscriptions;
 RETURN NEW;
END $$;

CREATE FUNCTION gochati_read_support_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.sender='user' AND OLD.read_at IS NULL AND NEW.read_at IS NOT NULL THEN
   UPDATE gochati_admin_events SET read_at=NEW.read_at WHERE message_id=NEW.id AND read_at IS NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER gochati_support_read_event AFTER UPDATE OF read_at ON gochati_support_messages
FOR EACH ROW EXECUTE FUNCTION gochati_read_support_event();
