CREATE TABLE gochati_deleted_users (id uuid PRIMARY KEY, deleted_at timestamptz NOT NULL DEFAULT now());
