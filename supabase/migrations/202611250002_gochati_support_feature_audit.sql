ALTER TABLE public.gochati_admin_support_audit
  ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'view',
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
