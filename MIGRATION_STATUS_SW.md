# GoChati Supabase migration status

- Removed Netlify deployment configuration and Netlify Functions directory.
- Replaced application runtime imports of the old Netlify platform client with the Supabase platform adapter.
- Replaced `/api/gochati-auth` Netlify proxy with a Supabase Edge Function proxy.
- Added `supabase/functions/gochati-auth/index.ts` for username login and registration using Supabase Auth and the existing `gochati_users` table.
- Kept the existing `api/gochati-login.ts` and `api/gochati-payment.ts` source files as requested.

Important: this archive addresses the reported unresolved Netlify import and removes Netlify deployment files. It does not claim that every existing API (data, chat, support, SMS, payment, withdrawals) has already been migrated to Supabase Edge Functions or that a production build has been verified. The current execution environment could not complete `npm ci` before timeout. Deploy the `gochati-auth` Edge Function and configure its Supabase secrets before relying on registration/login.
