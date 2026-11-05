# Hali ya migration ya Gochati

## Kilichofanyika kwenye package hii
- Imeongezwa floating button ya WhatsApp Channel juu ya Customer Service, yenye blink animation.
- `.env` ya ndani imeondolewa ili credentials zisambazwe ndani ya ZIP.

## Muhimu: hii bado SI migration iliyokamilika
Code ya sasa bado inategemea Netlify Identity, `@netlify/database`, na Netlify Functions. Vercel haiendeshi Netlify Functions moja kwa moja. Kwa hiyo usi-deploy package hii kama toleo la production ukitarajia Supabase Auth, login, registration na malipo tayari vimehamishwa.

Migration kamili inahitaji kubadilisha backend endpoints zote kuwa Vercel/TanStack server routes, kuhamisha database access kwenda Supabase PostgreSQL, na kubadilisha auth client kuwa Supabase Auth. Hili halijatekelezwa wala kuthibitishwa kwenye package hii.

## Environment variables zinazotarajiwa kwa migration ya mwisho
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose as `VITE_*`)
- `SPLASHPAY_API_KEY` na `SPLASHPAY_API_SECRET` (server-only)
- `DARSMS_API_KEY` (server-only, ikiwa SMS inatumika)
- `OPENAI_API_KEY` (server-only, ikiwa chat AI inatumika)

Usibadilishe au kufuta tables za shared Supabase project bila backup na migration SQL iliyokaguliwa. Mabadiliko ya Gochati yawekwe kwenye namespace/tables zake tu.
