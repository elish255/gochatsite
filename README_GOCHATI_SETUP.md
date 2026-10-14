# Gochati.site setup

## Isolated database
Run migrations in order in the Supabase SQL Editor for the shared database: `202610130001_gochati_isolated_schema.sql`, then `202610140001_gochati_username_vip_notifications.sql`, and then `202610140002_gochati_splashpay.sql`. The second migration adds username-login lookup data, referral tracking, VIP flags, and notification dismissal support. They use only `gochati_*` objects and do not rename, drop, or write to the existing Chatdunia tables.

## Username login and referrals
- Users sign in with their username and password. The `/api/gochati-login` endpoint privately resolves the username to its account email server-side; it does not expose account emails to the browser.
- The optional referral username on registration can be prefilled using `/register?ref=USERNAME`. A successful signup records the referral in the Gochati-only user table.
- VIP costs TZS 35,000 through the same payment API. Premium users can withdraw after upgrading to VIP or recording 20 referrals.

## Admin account
1. Create the admin login user in Supabase Authentication > Users (email + password).
2. Copy that user's UUID.
3. Run this SQL, replacing the UUID with the real auth user UUID:

```sql
insert into public.gochati_admins (user_id)
values ('PASTE-ADMIN-AUTH-USER-UUID-HERE'::uuid)
on conflict (user_id) do nothing;
```

4. Visit `/admin` and sign in with that same email and password. Only users listed in `gochati_admins` can view the panel.

## Environment variables
Keep the existing Supabase URL and publishable/anon key configured in Vercel. The payment API also needs `SUPABASE_SERVICE_ROLE_KEY` and the payment provider secret as configured for your account. Do not commit `.env` or service-role secrets into GitHub.

## Branding and images
- Main logo: `public/gochat/logo.png`
- Favicon: `public/favicon.ico`, `public/favicon.png`, `public/gochat/favicon.png`
- Foreigner portraits are served from `public/avators/`; use the exact lowercase `avators` path in the app because deployments run on a case-sensitive filesystem.
- Customer service button calls `+255 743 871 339`.

## Paid chat timer
- Active users' chosen chat session is started and completed through the Gochati-only SQL RPCs. The database refuses to credit the selected earning until the full configured duration has elapsed.
- Run the new migration before testing username login, referral tracking, notifications, VIP payments, or timed earnings.

## SplashPay collections integration
The payment API uses SplashPay's Mobile Money collection endpoint and status-check endpoint. Configure these **server-only** environment variables in Vercel (Production, Preview, and Development as appropriate):
- `SPLASHPAY_API_KEY` = merchant API key (`pk_live_...` for production)
- `SPLASHPAY_API_SECRET` = merchant API secret (`sk_live_...` for production)
- `SUPABASE_SERVICE_ROLE_KEY` = existing Supabase service-role key
- `SUPABASE_URL` (or existing `VITE_SUPABASE_URL`)
- `SUPABASE_PUBLISHABLE_KEY` (or existing `VITE_SUPABASE_PUBLISHABLE_KEY` / anon-key equivalent)

Do not put SplashPay secrets in `VITE_*` variables, client-side code, GitHub, or chat messages. Apply `supabase/migrations/202610140002_gochati_splashpay.sql` in Supabase SQL Editor. No webhook is required: the frontend calls the authenticated `/api/gochati-payment` endpoint with `action: "status"`, and that server endpoint checks the payment directly through SplashPay `/payments/check-status`. The account is activated/upgraded only after the endpoint verifies the successful status, reference, amount, and currency.

Test first with SplashPay test credentials and a test transaction. Do not remove old provider environment variables until the SplashPay integration has been tested in the deployed environment.
