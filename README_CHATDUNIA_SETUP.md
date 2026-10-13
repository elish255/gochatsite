# Gotchati deployment notes

## Included in this update
- Local self-contained brand and avatar SVGs under `public/`; no dependency on the old asset CDN paths.
- `/register`, `/login`, `/payment`, and `/admin` routes. Registration asks for full name, username, phone, East African country, password and repeated password. The registration and login UI uses username instead of asking the user for email.
- Supabase migration creates only `gotchati_*` tables and a separate auth trigger. It does not alter the shared `profiles` table or unrelated website tables.
- Payment Edge Function sends a mobile payment request and checks order status server-side. On provider `SUCCESS`/`COMPLETED`, it marks the user paid and active.
- Withdrawal SQL RPC enforces an active account, a minimum of TZS 100,000 and sufficient balance atomically.

## Required Supabase setup
1. Run `supabase/migrations/202610100001_gotchati_features.sql` in the Supabase SQL editor for the exact project used by this site.
2. In Supabase Auth settings, turn **Confirm email OFF** if you want username-only signup to create a session immediately. The UI uses a non-deliverable internal alias (`username@users.Gotchati.invalid`) because Supabase password auth requires an email or phone identifier; users never enter or see that alias. If email confirmation must remain on, implement a server-side username-auth flow before launch.
3. Deploy the payment function: `supabase functions deploy Gotchati-payment`.
4. Set secrets on the Supabase Edge Function runtime (not as `VITE_*` frontend variables):
   - `FIMIPAY_SECRET_KEY` = your provider secret key
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` are normally injected by Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` is required by the function and must never be exposed to the browser
5. Use a **live** provider key only after provider verification. Test keys return simulated results and do not send a real phone prompt.
6. To make an admin, first create/sign up the admin user in Supabase Auth, then insert that auth UUID into `public.gotchati_admins(user_id)`. Example:
   `insert into public.gotchati_admins(user_id) values ('AUTH-USER-UUID-HERE');`
7. Set a real balance-crediting/chat-earnings backend before accepting real withdrawals. The current homepage's preview/earnings UI is not proof of real earned funds. The withdrawal RPC protects the database balance but does not itself create earnings.

## Security notes
- Never put the provider secret or Supabase service-role key in `VITE_*` variables or frontend code.
- Admin table operations are protected by `gotchati_admins` RLS policies. The admin route supports user activation/deactivation/ban, notifications, and marking withdrawals paid. Admin account impersonation needs a separate audited server-side implementation and is not enabled by the current client-only panel.
- The site hides the provider brand in user-facing interface text; provider requests happen inside the Edge Function.
