CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner_id text NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  sender text NOT NULL CHECK (sender IN ('user', 'demo')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own messages" ON public.chat_messages FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users send their own messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) AND sender = 'user');
CREATE INDEX chat_messages_user_partner_time_idx ON public.chat_messages (user_id, partner_id, created_at);