# Marekebisho ya usajili wa Gochati

## Kilichorekebishwa

- Folda za Supabase zilikuwa na majina yasiyo sahihi (`supabase `, `function ` na `migrations ` zikiwa na nafasi za mwisho). Supabase CLI haikuweza kutambua Edge Function na migrations. Sasa ziko kwenye `supabase/functions` na `supabase/migrations`.
- `supabase/config.toml` sasa ina project ref ya Gochati na `verify_jwt = false` kwa `gochati-auth`. Endpoint hii inapokea maombi ya usajili/kuingia kutoka kwenye backend ya website; uthibitishaji wa taarifa na matumizi ya service-role key hubaki ndani ya Edge Function.
- Usajili sasa unatumia `upsert` kwa profile ili kuepuka kushindwa pale trigger ya `auth.users` inapokuwa tayari imeunda profile.
- Referral username inapitishwa kwenye metadata ili trigger iweze kuhifadhi uhusiano wa referral.

## Hatua za lazima baada ya kupakia folder

Kutoka kwenye folder kuu la project, tumia Supabase CLI na project sahihi:

```bash
npx supabase login
npx supabase link --project-ref ztxnmsdbxmcrovobslgo
npx supabase db push
npx supabase functions deploy gochati-auth
```

Kisha redeploy website kwenye Vercel. Hakikisha environment variables za Vercel zina `SUPABASE_URL` na `SUPABASE_PUBLISHABLE_KEY` (au `SUPABASE_ANON_KEY`) zinazolingana na project hiyo. `SUPABASE_SERVICE_ROLE_KEY` inahitajika ndani ya Supabase Edge Function na haipaswi kuwekwa kwenye browser wala `VITE_` variable.

## Muhimu

Marekebisho ya source code pekee hayawezi kuchapisha Edge Function kwenye Supabase moja kwa moja. Lazima utekeleze hatua za deploy hapo juu kwenye project husika. Baada ya hapo jaribu kujisajili kwa email/username mpya; usitumie tena taarifa za akaunti ya majaribio iliyokwisha tengenezwa.
