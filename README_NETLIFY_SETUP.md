# Gochati kwenye Netlify

Akaunti zinatumia Netlify Identity; taarifa za programu zinahifadhiwa kwenye Netlify Database (Postgres). Huu ni mwanzo mpya: akaunti na rekodi za mfumo wa zamani hazijahamishwa. Watumiaji wanajisajili upya na kuingia kwa **email na password**.

## Database na deploy

Migrations zilizo kwenye `netlify/database/migrations/` zinatengeneza profiles za watumiaji, ruhusa za admin, ada, notifications, ujumbe, vipindi vya simulation, maombi ya withdrawal ya majaribio na historia ya mabadiliko ya admin. Netlify huzitumia wakati wa deploy; hakuna connection string inayowekwa kwenye browser. Deploy preview hutumia database branch iliyotengwa.

Ukurasa wa mwanzo unaendelea kutumia module ya browser iliyopo na media za mradi. API za data na malipo zinaendeshwa na Netlify Functions. Ruhusa, umiliki wa rekodi na ada zinakaguliwa kwenye server. Watumiaji hawawezi kubadilisha balance, membership au kutengeneza risiti ya malipo.

## Admin wa kwanza

1. Baada ya deploy, fungua `/register` kwenye tovuti.
2. Jisajili kwa **yohanaelisha164@gmail.com** na password unayochagua mwenyewe. Usitumie password kwenye source code au mazungumzo.
3. Thibitisha email kupitia kiungo cha Netlify Identity kinachotumwa kwenye inbox. Angalia spam kama hakionekani.
4. Fungua `/admin` na uingie kwa email hiyo na password yako. Admin hahitaji kulipa ada ili kutumia panel.
5. Kama umesahau password, tumia **Umesahau password?** kwenye login au admin. Kiungo cha recovery kinafungua sehemu ya kuweka password mpya.

Email ya admin inatoka kwenye allowlist ya database, na lazima iwe imethibitishwa na Identity. Username au metadata ya mtumiaji haitoi ruhusa za admin. Ukiwa na akaunti ya email hiyo kwenye Identity tayari, ingia au tumia recovery badala ya kujisajili tena.

Admin anaweza kuwasha/kusimamisha akaunti, kuweka au kuondoa Premium/VIP, kurekebisha balance ya majaribio, kutuma notifications, kuona ada za SplashPay na kuthibitisha hali yake kupitia provider. Mabadiliko ya admin yanahifadhiwa kwenye audit history. Kuwasha akaunti kwa manual hakutengenezi risiti ya SplashPay. Orodha za admin zinaonyesha hadi rekodi 1,000 za karibuni.

## Kuweka SplashPay environment variables

Kwenye [Netlify project configuration](https://app.netlify.com/projects/gochationline/configuration/env), fungua **Environment variables → Add a variable**:

- `SPLASHPAY_API_KEY`: merchant API key kutoka SplashPay.
- `SPLASHPAY_API_SECRET`: API secret inayolingana na key hiyo. Muunganisho uliopo hutumia vyote viwili.

Weka variables hizi kwenye scope ya **Functions/runtime**, katika deploy context inayotumika. Tumia credentials za majaribio kwenye Deploy Previews na credentials za live kwenye Production baada ya kufanya majaribio. Save kisha redeploy. Usiweke credentials kwenye variables zinazoanza na `VITE_`, kwenye GitHub, browser au chat. Hakuna webhook secret inayohitajika kwa flow hii.

Muunganisho hutumia `https://api.splashpay.co.tz/api/v1`, `POST /payments/mobile-money` na `POST /payments/check-status`, pamoja na headers `X-API-KEY` na `X-API-SECRET`. Hii ndiyo API contract iliyokuwepo kwenye mradi; ithibitishe kwa akaunti yako ya SplashPay kabla ya kutumia live. Kama merchant wako amepewa API version tofauti, rekebisha adapter upande wa server kulingana na nyaraka zake.

Ada zilizowekwa kwenye server ni activation **TZS 16,000**, Premium **TZS 32,000**, na VIP **TZS 35,000**. Jibu la kuanzisha ombi pekee haliwashi akaunti. Server inakagua reference, kiasi, currency na status kupitia SplashPay kabla ya kuhifadhi mafanikio na kuwasha huduma kwa transaction moja. Status inaweza kukaguliwa na mwenye malipo au admin.

Ombi linalosubiri au lenye matokeo yasiyojulikana linatumia reference ileile na idempotency key ileile. Mtumiaji asilipe tena akipata timeout; akague ombi hilo. Baada ya reload, kuanzisha ada ileile kunatumia ombi linalosubiri badala ya kuunda invoice nyingine. Hakuna pesa inayotumwa kama payout.

## Simulation na malipo halisi

Chat replies, balance na withdrawals ni **majaribio**. Salio hilo haliwakilishi pesa zinazoweza kutolewa. Withdrawal ya majaribio haihitaji kununua Premium/VIP na haiiti SplashPay payouts. Admin akiweka ombi la majaribio kuwa Paid, hakuna pesa halisi inayotumwa. SplashPay hutumika kwa ada za huduma pekee.

## Ukaguzi

`npm test` hukagua routing, kuzuia mabadiliko yasiyoidhinishwa, kutenganisha rekodi za users na uthibitisho wa taarifa za malipo. TypeScript inaweza kukaguliwa kwa `npx tsc --noEmit`; Functions zinaweza kukaguliwa kwa `npx tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --skipLibCheck --types node netlify/functions/*.mts netlify/lib/*.ts`.

Baada ya deploy, jaribu usajili na email confirmation, login/logout, password recovery, admin login na account ya kawaida isiyo na ruhusa za admin. Tumia SplashPay test credentials kufanya malipo ya majaribio kwa kila ada, na uhakikishe malipo yanayoonekana kwenye dashboard ya provider yanalingana na rekodi za admin. Muunganisho haujathibitishwa kwa transaction ya live.
