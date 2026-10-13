# Gochati.site setup

## Isolated database
Run `supabase/migrations/202610130001_gochati_isolated_schema.sql` in the Supabase SQL Editor for the shared database. It creates and uses only `gochati_*` tables/functions and the `gochati_auth_user_created` trigger. It does not rename, drop, or write to the existing Chatdunia tables.

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
