import * as l from "react";
import { SupportButton } from "./SupportButton";
import { platform } from "@/integrations/netlify/client";
import { jsx as reactJsx, jsxs as reactJsxs, Fragment } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { ActivationRequiredDialog } from "./ActivationRequiredDialog";
const logoAsset = { url: "/gochat/logo.svg" };
import { ArrowRight as f, BellRing as p, CircleCheck as m, Clock as h, Download as g, EllipsisVertical as _, Headphones as v, MessageCircle as y, MessageSquare as b, Moon as ee, PhoneOff as x, Phone as S, Plus as C, Send as w, Share as T, ShieldCheck as E, Star as D, Sun as O, TrendingUp as te, UserPlus as ne, Video as k, Wallet as A, X as j } from "lucide-react";
const portraits = Object.fromEntries(Array.from({ length: 52 }, (_, index) => { const n = Math.floor(index / 2) + 10; const gender = index % 2 === 0 ? "women" : "men"; return [`person-${index + 1}`, `/avators/${gender}-${n}.jpg`]; }));
function render(factory, type, props, key) {
 if (type === "button") return factory(Button, { ...props, variant: "reference", size: "reference" }, key);
 if (type === "a") return factory(Button, { variant: "reference", size: "reference", asChild: true, children: factory("a", props) }, key);
 return factory(type, props, key);
}
const runtime = { Fragment, jsx: (type, props, key) => render(reactJsx, type, props, key), jsxs: (type, props, key) => render(reactJsxs, type, props, key) };
const M = [
    { label: `Dakika 1`, minutes: 1, amount: 5e3 },
    { label: `Dakika 5`, minutes: 5, amount: 25e3 },
  ],
  N = [
    `Emma`,
    `Sophie`,
    `Hannah`,
    `Laura`,
    `Marie`,
    `Julia`,
    `Anna`,
    `Chloe`,
    `Lucia`,
    `Elena`,
    `Nora`,
    `Ida`,
    `Freya`,
    `Katrin`,
    `Isabel`,
    `Amelie`,
    `Clara`,
    `Sara`,
    `Nina`,
    `Maja`,
    `Olivia`,
    `Lena`,
    `Alice`,
    `Ella`,
    `Mia`,
  ],
  P = [
    `Lucas`,
    `Daniel`,
    `Thomas`,
    `Peter`,
    `Jonas`,
    `Marc`,
    `Oliver`,
    `Henrik`,
    `Felix`,
    `Andreas`,
    `Mateo`,
    `Erik`,
    `Liam`,
    `Noah`,
    `Adrian`,
    `Simon`,
    `Victor`,
    `Pablo`,
    `Nils`,
    `Kevin`,
    `Jack`,
    `Leon`,
    `Hugo`,
    `Max`,
    `Sven`,
  ],
  F = [
    [`Germany`, `🇩🇪`],
    [`France`, `🇫🇷`],
    [`Sweden`, `🇸🇪`],
    [`Norway`, `🇳🇴`],
    [`USA`, `🇺🇸`],
    [`Canada`, `🇨🇦`],
    [`Italy`, `🇮🇹`],
    [`Spain`, `🇪🇸`],
    [`Netherlands`, `🇳🇱`],
    [`Denmark`, `🇩🇰`],
    [`Belgium`, `🇧🇪`],
    [`Austria`, `🇦🇹`],
    [`Finland`, `🇫🇮`],
    [`Ireland`, `🇮🇪`],
    [`Switzerland`, `🇨🇭`],
    [`UK`, `🇬🇧`],
    [`Poland`, `🇵🇱`],
    [`Australia`, `🇦🇺`],
    [`Portugal`, `🇵🇹`],
    [`Greece`, `🇬🇷`],
  ],
  re = Array.from({ length: 52 }, (e, t) => {
    let n = t % 2 == 0,
      r = n ? N : P,
      i = r[Math.floor(t / 2) % r.length],
      [a, o] = F[t % F.length],
      s = (Math.floor(t / 2) % 60) + 10;
    return {
      id: t + 1,
      name: i,
      age: 22 + ((t * 7) % 26),
      country: a,
      flag: o,
      photo: portraits[`person-${t + 1}`],
      online: t % 3 != 2,
      rate: M[t % M.length],
    };
  }),
  I = (e) => `TZS ` + e.toLocaleString(`en-US`),
  L = `/register`,
  R = `255770490075`,
  z = `https://whatsapp.com/channel/0029VbD8rnC0LKZD9MUuzN2h`,
  B = `0770429130`,
  V = [
    `Juma M.`,
    `Amina K.`,
    `Baraka L.`,
    `Neema S.`,
    `Salma H.`,
    `Rashid A.`,
    `Doris P.`,
    `Frank T.`,
    `Zawadi N.`,
    `Hamisi J.`,
    `Grace M.`,
    `Tumaini B.`,
    `Asha R.`,
    `Emmanuel K.`,
    `Halima Y.`,
    `Peter S.`,
  ],
  H = [
    `Dar es Salaam`,
    `Arusha`,
    `Mwanza`,
    `Dodoma`,
    `Mbeya`,
    `Tanga`,
    `Morogoro`,
    `Zanzibar`,
    `Iringa`,
    `Kigoma`,
  ],
  U = [`M-Pesa`, `Tigo Pesa`, `Airtel Money`, `HaloPesa`, `Mixx by Yas`];
function W() {
  let e = V[Math.floor(Math.random() * V.length)],
    t = H[Math.floor(Math.random() * H.length)],
    n = U[Math.floor(Math.random() * U.length)],
    r = (Math.floor(Math.random() * 28) + 5) * 1e4,
    i = Math.floor(Math.random() * 12) + 1;
  return {
    id: Math.random().toString(36).slice(2),
    text: `${e} kutoka ${t} ametoa ${I(r)} kupitia ${n} • Dakika ${i} zilizopita`,
  };
}
var G = [
    {
      name: `Joseph Mwakalinga`,
      place: `Mbeya`,
      stars: 5,
      text: `Nimechati dakika 30 tu nikalipwa TZS 50,000. Duniachat ni halali kabisa!`,
    },
    {
      name: `Rehema Said`,
      place: `Tanga`,
      stars: 5,
      text: `Ninafurahia mazungumzo na kujifunza kuhusu tamaduni.`,
    },
    {
      name: `Daniel Kimaro`,
      place: `Moshi`,
      stars: 4,
      text: `Wazungu wanaongea vizuri na malipo yanaeleweka. Napenda sana.`,
    },
    {
      name: `Fatuma Ally`,
      place: `Dar es Salaam`,
      stars: 5,
      text: `Nimeshatoa zaidi ya TZS 400,000 mwezi huu. Asanteni sana Duniachat.`,
    },
    {
      name: `Baraka Lyimo`,
      place: `Arusha`,
      stars: 5,
      text: `Huduma kwa wateja wanajibu haraka sana kwenye WhatsApp.`,
    },
  ],
  K = runtime;
function q({ person: e, onChat: t, onCall: n }) {
  return (0, K.jsxs)(`div`, {
    className: `card-soft flex flex-col gap-3 p-4 sm:flex-row sm:items-center`,
    children: [
      (0, K.jsxs)(`div`, {
        className: `flex items-center gap-4`,
        children: [
          (0, K.jsxs)(`div`, {
            className: `relative shrink-0`,
            children: [
              (0, K.jsx)(`img`, {
                src: e.photo,
                onError: (event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/avators/women-10.jpg"; },
                alt: `${e.name} kutoka ${e.country}`,
                loading: `lazy`,
                className: `size-16 rounded-full border-2 border-primary/40 object-cover`,
              }),
              (0, K.jsx)(`span`, {
                className: `absolute bottom-0.5 right-0.5 size-4 rounded-full border-2 border-card ${e.online ? `animate-pulse bg-success` : `bg-muted-foreground`}`,
              }),
            ],
          }),
          (0, K.jsxs)(`div`, {
            className: `min-w-0 flex-1`,
            children: [
              (0, K.jsxs)(`p`, {
                className: `truncate font-bold`,
                children: [e.name, `, `, e.age],
              }),
              (0, K.jsxs)(`p`, {
                className: `text-xs text-muted-foreground`,
                children: [
                  (0, K.jsx)(`span`, {
                    className: `mr-1 text-base`,
                    children: e.flag,
                  }),
                  e.country,
                ],
              }),
              (0, K.jsx)(`span`, {
                className: `mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold lowercase tracking-normal ${e.online ? `bg-success/15 text-success` : `bg-destructive/15 text-destructive`}`,
                children: e.online ? `online` : `offline`,
              }),
              (0, K.jsxs)(`div`, {
                className: `mt-2 inline-block rounded-lg border border-border bg-secondary/70 px-2.5 py-1 text-[11px] font-semibold`,
                children: [e.rate.label, ` — `, I(e.rate.amount)],
              }),
            ],
          }),
        ],
      }),
      (0, K.jsxs)(`div`, {
        className: `flex flex-row items-center gap-2 sm:ml-auto`,
        children: [
          (0, K.jsxs)(`button`, {
            onClick: t,
            className: `flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground transition active:scale-95 sm:flex-none`,
            children: [(0, K.jsx)(y, { className: `size-4` }), ` Chat`],
          }),
          (0, K.jsxs)(`button`, {
            onClick: () => n(`voice`),
            className: `flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-voice px-3 py-2.5 text-xs font-bold text-on-color transition active:scale-95 sm:flex-none`,
            children: [(0, K.jsx)(S, { className: `size-4` }), ` Voice Call`],
          }),
          (0, K.jsxs)(`button`, {
            onClick: () => n(`video`),
            className: `flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-video px-3 py-2.5 text-xs font-bold text-on-color transition active:scale-95 sm:flex-none`,
            children: [(0, K.jsx)(k, { className: `size-4` }), ` Video Call`],
          }),
        ],
      }),
    ],
  });
}
var J = (e) => e.charAt(0).toUpperCase() + e.slice(1);
function Y(e) {
  let t = e.match(
    /(?:naitwa|jina langu ni|mimi ni|my name is|i am|i'm)\s+([a-zA-Z]{2,15})/i,
  );
  return t && t[1] ? J(t[1].toLowerCase()) : null;
}
function X(e) {
  let t = e.match(/(?:natokea|natoka|niko|nipo|from)\s+([a-zA-Z]{3,20})/i);
  return t && t[1] ? J(t[1].toLowerCase()) : null;
}
var ie = [
    {
      test: /(habari|mambo|vipi|hujambo|hello|hi|salama|shikamoo|niaje)/i,
      replies: (e) => [
        `Nzuri sana! Leo nimeamka na hamu ya kujifunza Kiswahili zaidi, wewe siku yako inakwendaje?`,
        `Salama kabisa. Mimi ni ${e}, nimefurahi kuanza mazungumzo na wewe leo.`,
      ],
    },
    {
      test: /(nafanya|kazi|job|work|shule|chuo|masomo)/i,
      replies: () => [
        `Hiyo ni kazi ya heshima kweli. Huwa inakuchukua muda mrefu kwa siku au unapata nafasi ya kupumzika?`,
        `Napenda watu wenye bidii. Ulianza lini kufanya hivyo?`,
      ],
    },
    {
      test: /(pesa|malipo|lipwa|payment|hela|fedha)/i,
      replies: () => [
        `Usiwe na wasiwasi kuhusu hilo, mfumo wenyewe hushughulikia malipo mara mazungumzo yetu yanapokamilika.`,
        `Mimi nalipia muda wangu hapa, hivyo endelea tu kuniambia habari zako.`,
      ],
    },
    {
      test: /(safari|utalii|tour|mlima|kilimanjaro|serengeti|beach|bahari|zanzibar)/i,
      replies: () => [
        `Ndoto yangu kubwa ni kupanda Kilimanjaro mwakani. Wewe umeshawahi kufika huko?`,
        `Nimeona picha za Serengeti na zilinivutia mno, naamini uhalisia ni mzuri zaidi.`,
      ],
    },
    {
      test: /(familia|mke|mume|mtoto|watoto|family|ndoa)/i,
      replies: () => [
        `Familia ni utajiri wa kweli. Mnaishi wote pamoja au mmesambaa sehemu tofauti?`,
        `Inapendeza sana kusikia hivyo. Mimi natamani siku moja kuwa na familia yenye utulivu kama hiyo.`,
      ],
    },
    {
      test: /(chakula|ugali|pilau|nyama|kula|food|samaki)/i,
      replies: () => [
        `Nilijaribu pilau mara moja kwenye mgahawa wa Kiafrika hapa, ladha yake sitaisahau kamwe.`,
        `Sasa umenifanya niwe na njaa! Wewe upishi wako unaanzia wapi?`,
      ],
    },
    {
      test: /(mpira|soka|football|muziki|music|filamu|movie|dansi)/i,
      replies: () => [
        `Mimi hufuatilia sana hiyo. Timu au msanii unayempenda zaidi ni yupi?`,
        `Tunafanana hapo, huwa inanipa raha baada ya siku ndefu ya kazi.`,
      ],
    },
    {
      test: /(hali ya hewa|jua|mvua|baridi|weather|joto)/i,
      replies: () => [
        `Huku kwetu kuna baridi kali sasa hivi, natamani jua la kwenu.`,
        `Joto la Afrika Mashariki linanivutia sana, hapa mwanga wa jua ni adimu.`,
      ],
    },
    {
      test: /(umri|miaka|age|old)/i,
      replies: () => [
        `Umri ni namba tu kwangu, muhimu ni mtu kuwa na moyo mzuri kama wako.`,
        `Naona tuko karibu kimtazamo, hiyo inatosha kufanya mazungumzo yawe matamu.`,
      ],
    },
    {
      test: /(asante|ahsante|thanks|shukrani)/i,
      replies: () => [
        `Karibu sana, furaha ni yangu kuongea nawe.`,
        `Hakuna shida hata kidogo, endelea kuniambia mengine.`,
      ],
    },
    {
      test: /\?$/,
      replies: () => [
        `Swali zuri. Kwa upande wangu naliona hivi: uzoefu wa moja kwa moja ndio hufundisha zaidi kuliko maelezo.`,
        `Nifikirie kidogo... naamini jibu lake linategemea hali ya mtu, lakini mimi ningechagua njia rahisi.`,
      ],
    },
  ],
  Z = [
    `Hiyo inanivutia kweli, niambie zaidi kidogo kuhusu hilo.`,
    `Aisee, sikuwahi kufikiria hivyo. Ilikuwaje mara ya kwanza?`,
    `Unaongea kwa ufasaha wa kupendeza. Je, siku zako nyingi huwa hivi?`,
    `Nakubaliana nawe kwa asilimia kubwa, ingawa mimi huwa naona upande mwingine pia.`,
    `Hii ndiyo sababu napenda kuongea na watu wa Tanzania, mnakuwa wakweli.`,
    `Naisikia hiyo. Ungependa tuzungumzie nini kingine kabla muda haujaisha?`,
  ];
function ae(e) {
  let t = new Set();
  return (n) => {
    let r = Y(n),
      i = X(n),
      a = [];
    if (r && i)
      a = [
        `Karibu sana ${r}! ${i} ni mahali pazuri, huwa napenda kusoma habari za utalii wa kule.`,
        `${r}, jina zuri. Nimeambiwa watu wa ${i} ni wakarimu mno, ni kweli?`,
      ];
    else if (r)
      a = [
        `Nafurahi kukutana nawe ${r}. Mimi ni ${e}, nimekuwa nikijifunza Kiswahili kwa miezi sita sasa.`,
        `${r}, jina lako linasikika vizuri. Unaishi mkoa gani?`,
      ];
    else if (i)
      a = [
        `${i}! Nimeona picha zake mtandaoni, hali ya hewa yake ni ya kuvutia. Umeishi huko muda gani?`,
        `Sijawahi kufika ${i}, lakini iko juu kwenye orodha yangu ya safari.`,
      ];
    else {
      let t = ie.find((e) => e.test.test(n.trim()));
      a = t ? t.replies(e, n) : Z;
    }
    let o = a.filter((e) => !t.has(e)),
      s = o.length ? o : Z.filter((e) => !t.has(e)),
      c = (s.length ? s : Z)[
        Math.floor(Math.random() * (s.length || Z.length))
      ];
    return (t.add(c), c);
  };
}
var Q = [
  `Habari yako! Nimekuwa nikisubiri mtu wa kuongea naye Kiswahili leo.`,
  `Hujambo? Naitwa hivyo unavyoona hapo juu, nafurahi umeingia.`,
  `Salamu kutoka huku! Naomba unieleze kidogo kuhusu wewe.`,
];
function oe({ person: e, onClose: t, onPaid: n, active = false }) {
  let [r, i] = (0, l.useState)(null),
    [a, o] = (0, l.useState)([]),
    [s, c] = (0, l.useState)(``),
    [u, d] = (0, l.useState)(!1),
    [f, p] = (0, l.useState)(0),
    m = (0, l.useRef)(ae(e.name)),
    g = (0, l.useRef)(null),
    _ = (0, l.useRef)(!1);
  ((0, l.useEffect)(() => {
    if (!r) return;
    let e = Q[Math.floor(Math.random() * Q.length)];
    d(!0);
    let t = setTimeout(() => {
      (d(!1), o([{ id: Date.now(), from: `them`, text: e }]));
    }, 2600);
    return () => clearTimeout(t);
  }, [r, e.name]),
    (0, l.useEffect)(() => {
      if (!r) return;
      let interval = null;
      let cancelled = false;
      let sessionId = null;
      _.current = false;
      const startCountdown = async () => {
        if (active) {
          const { data: { user } } = await platform.auth.getUser();
          if (!user || cancelled) return;
          const { data, error } = await platform.rpc("gochati_start_earning_session", { p_amount: r.amount, p_minutes: r.minutes, p_partner: `person-${e.id}` });
          if (cancelled) return;
          if (error || !data) {
            o((items) => [...items, { id: Date.now(), from: `them`, text: `Imeshindikana kuanza kipindi cha kulipwa. Tafadhali funga chat na ujaribu tena.` }]);
            p(0);
            return;
          }
          sessionId = data;
        }
        const duration = Math.max(1, Number(r.minutes || 1)) * 60;
        const deadline = Date.now() + duration * 1000;
        p(duration);
        interval = setInterval(() => {
          const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
          p(remaining);
          if (remaining === 0 && !_.current) {
            _.current = true;
            clearInterval(interval);
            void n(r.amount, sessionId);
          }
        }, 250);
      };
      void startCountdown();
      return () => { cancelled = true; if (interval) clearInterval(interval); };
    }, [r, n, active, e.id]),
    (0, l.useEffect)(() => {
      g.current?.scrollIntoView({ behavior: `smooth` });
    }, [a, u]));
  let v = () => {
      let e = s.trim();
      if (!e || f === 0) return;
      (o((t) => [...t, { id: Date.now(), from: `me`, text: e }]), c(``));
      let t = m.current(e);
      d(!0);
      let n = 1800 + Math.random() * 1600,
        r = Math.min(11e3, t.length * 95);
      setTimeout(() => {
        (d(!1),
          o((e) => [...e, { id: Date.now() + 1, from: `them`, text: t }]));
      }, n + r);
    },
    y = String(Math.floor(f / 60)).padStart(2, `0`),
    b = String(f % 60).padStart(2, `0`);
  return (0, K.jsx)(`div`, {
    className: `fixed inset-0 z-[70] flex items-end justify-center bg-overlay/60 p-0 backdrop-blur-sm sm:items-center sm:p-4`,
    children: (0, K.jsxs)(`div`, {
      className: `card-soft flex h-[92vh] w-full max-w-lg flex-col overflow-hidden sm:h-[80vh]`,
      children: [
        (0, K.jsxs)(`div`, {
          className: `grad-brand flex items-center gap-3 p-4 text-on-color`,
          children: [
            (0, K.jsx)(`img`, {
              src: e.photo,
              alt: e.name,
              className: `size-11 rounded-full border-2 border-on-color/70 object-cover`,
            }),
            (0, K.jsxs)(`div`, {
              className: `min-w-0 flex-1`,
              children: [
                (0, K.jsxs)(`p`, {
                  className: `truncate text-sm font-bold`,
                  children: [e.name, `, `, e.age, ` `, e.flag],
                }),
                (0, K.jsx)(`p`, {
                  className: `text-xs opacity-90`,
                  children: `Online`,
                }),
              ],
            }),
            r &&
              (0, K.jsxs)(`span`, {
                className: `flex items-center gap-1.5 rounded-full bg-overlay/30 px-3 py-1.5 text-sm font-bold tabular-nums`,
                children: [(0, K.jsx)(h, { className: `size-4` }), y, `:`, b],
              }),
            (0, K.jsx)(`button`, {
              onClick: t,
              "aria-label": `Funga`,
              className: `rounded-full bg-overlay/25 p-2`,
              children: (0, K.jsx)(j, { className: `size-4` }),
            }),
          ],
        }),
        r
          ? (0, K.jsxs)(K.Fragment, {
              children: [
                (0, K.jsxs)(`div`, {
                  className: `flex-1 space-y-3 overflow-y-auto bg-background/60 p-4`,
                  children: [
                    a.map((e) =>
                      (0, K.jsx)(
                        `div`,
                        {
                          className:
                            e.from === `me`
                              ? `flex justify-end`
                              : `flex justify-start`,
                          children: (0, K.jsx)(`div`, {
                            className:
                              e.from === `me`
                                ? `max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground`
                                : `max-w-[80%] rounded-2xl rounded-bl-sm bg-secondary px-4 py-2.5 text-sm text-secondary-foreground`,
                            children: e.text,
                          }),
                        },
                        e.id,
                      ),
                    ),
                    u &&
                      (0, K.jsx)(`div`, {
                        className: `flex justify-start`,
                        children: (0, K.jsx)(`div`, {
                          className: `rounded-2xl bg-secondary px-4 py-3`,
                          children: (0, K.jsxs)(`span`, {
                            className: `flex gap-1`,
                            children: [
                              (0, K.jsx)(`span`, {
                                className: `size-2 animate-bounce rounded-full bg-muted-foreground`,
                              }),
                              (0, K.jsx)(`span`, {
                                className: `size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]`,
                              }),
                              (0, K.jsx)(`span`, {
                                className: `size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]`,
                              }),
                            ],
                          }),
                        }),
                      }),
                    (0, K.jsx)(`div`, { ref: g }),
                  ],
                }),
                (0, K.jsxs)(`div`, {
                  className: `flex items-center gap-2 border-t border-border p-3`,
                  children: [
                    (0, K.jsx)(`input`, {
                      value: s,
                      onChange: (e) => c(e.target.value),
                      onKeyDown: (e) => e.key === `Enter` && v(),
                      placeholder: `Andika ujumbe wako...`,
                      disabled: f === 0,
                      className: `flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary`,
                    }),
                    (0, K.jsx)(`button`, {
                      onClick: v,
                      disabled: f === 0,
                      "aria-label": `Tuma`,
                      className: `grad-brand rounded-xl p-3 text-on-color disabled:opacity-50`,
                      children: (0, K.jsx)(w, { className: `size-5` }),
                    }),
                  ],
                }),
              ],
            })
          : (0, K.jsxs)(`div`, {
              className: `flex-1 overflow-y-auto p-5`,
              children: [
                (0, K.jsx)(`h4`, {
                  className: `text-center text-base font-bold`,
                  children: `Chagua muda na kiasi cha malipo`,
                }),
                (0, K.jsx)(`p`, {
                  className: `mt-1 text-center text-xs text-muted-foreground`,
                  children: `Utalipwa mara baada ya mazungumzo kukamilika.`,
                }),
                (0, K.jsx)(`div`, {
                  className: `mt-5 grid gap-3`,
                  children: M.map((e) =>
                    (0, K.jsxs)(
                      `button`,
                      {
                        onClick: () => i(e),
                        className: `flex items-center justify-between rounded-2xl border border-border bg-secondary/60 px-4 py-4 text-left transition hover:border-primary active:scale-[0.98]`,
                        children: [
                          (0, K.jsx)(`span`, {
                            className: `font-semibold`,
                            children: e.label,
                          }),
                          (0, K.jsx)(`span`, {
                            className: `grad-profit rounded-lg px-3 py-1.5 text-sm font-bold text-on-color`,
                            children: I(e.amount),
                          }),
                        ],
                      },
                      e.label,
                    ),
                  ),
                }),
              ],
            }),
      ],
    }),
  });
}
function se({ person: e, kind: t, onClose: n, active = false }) {
  let [r, i] = (0, l.useState)(!1),
    [a, o] = (0, l.useState)(3),
    s = (0, l.useRef)(null),
    c = (0, l.useRef)(null),
    [u, d] = (0, l.useState)(!1),
    f = () => {
      (c.current?.getTracks().forEach((e) => e.stop()),
        (c.current = null),
        d(!1));
    };
  return (
    (0, l.useEffect)(() => {
      let e = !1;
      return (
        t === `video` &&
          navigator.mediaDevices?.getUserMedia &&
          navigator.mediaDevices
            .getUserMedia({ video: { facingMode: `user` }, audio: !1 })
            .then((t) => {
              if (e) {
                t.getTracks().forEach((e) => e.stop());
                return;
              }
              ((c.current = t),
                d(!0),
                s.current &&
                  ((s.current.srcObject = t),
                  s.current.play().catch(() => {})));
            })
            .catch(() => {}),
        () => {
          ((e = !0), f());
        }
      );
    }, [t]),
    (0, l.useEffect)(() => {
      u &&
        s.current &&
        c.current &&
        ((s.current.srcObject = c.current), s.current.play().catch(() => {}));
    }, [u, r]),
    (0, l.useEffect)(() => {
      let e = setInterval(() => o((e) => (e > 0 ? e - 1 : 0)), 1e3),
        t = setTimeout(() => {
          (f(), i(!0));
        }, 3e3);
      return () => {
        (clearInterval(e), clearTimeout(t));
      };
    }, []),
    (0, K.jsx)(`div`, {
      className: `fixed inset-0 z-[85] flex items-center justify-center bg-overlay/80 p-4`,
      children: (0, K.jsxs)(`div`, {
        className: `animate-pop-in card-soft w-full max-w-sm p-6 text-center`,
        children: [
          t === `video` && !r
            ? (0, K.jsxs)(`div`, {
                className: `relative mx-auto w-full overflow-hidden rounded-2xl border border-primary/30 bg-overlay`,
                children: [
                  (0, K.jsx)(`video`, {
                    ref: s,
                    muted: !0,
                    playsInline: !0,
                    autoPlay: !0,
                    className: `aspect-[3/4] w-full object-cover`,
                  }),
                  !u &&
                    (0, K.jsx)(`div`, {
                      className: `absolute inset-0 flex items-center justify-center text-xs text-on-color/70`,
                      children: `Inawasha camera...`,
                    }),
                  (0, K.jsx)(`img`, {
                    src: e.photo,
                    alt: e.name,
                    className: `absolute bottom-2 right-2 size-14 rounded-lg border border-on-color/30 object-cover`,
                  }),
                ],
              })
            : (0, K.jsx)(`img`, {
                src: e.photo,
                onError: (event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/avators/women-10.jpg"; },
                alt: e.name,
                className: `mx-auto size-24 rounded-full border-4 border-primary/40 object-cover`,
              }),
          (0, K.jsxs)(`h3`, {
            className: `mt-3 text-lg font-bold`,
            children: [e.name, ` `, e.flag],
          }),
          r
            ? (0, K.jsxs)(K.Fragment, {
                children: [
                  (0, K.jsx)(`p`, {
                    className: `mt-3 text-sm font-semibold text-destructive`,
                    children: active ? `Imeshindwa Kuanzisha, Endelea Kuchat` : `Huwezi kutumia huduma hii mpaka uwe na account hai.`,
                  }),
                  !active && (0, K.jsx)(`a`, {
                    href: L,
                    className: `grad-withdraw mt-4 block w-full rounded-xl px-4 py-3 text-sm font-bold text-on-color`,
                    children: `Fungua Account Hapa`,
                  }),
                ],
              })
            : (0, K.jsxs)(K.Fragment, {
                children: [
                  (0, K.jsxs)(`p`, {
                    className: `mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground`,
                    children: [
                      t === `video`
                        ? (0, K.jsx)(k, { className: `size-4` })
                        : (0, K.jsx)(S, { className: `size-4` }),
                      `Inaita... 00:0`,
                      a,
                    ],
                  }),
                  (0, K.jsx)(`div`, {
                    className: `mt-5 flex justify-center`,
                    children: (0, K.jsx)(`span`, {
                      className: `grad-brand size-3 animate-ping rounded-full`,
                    }),
                  }),
                ],
              }),
          (0, K.jsxs)(`button`, {
            onClick: () => {
              (f(), n());
            },
            className: `mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground`,
            children: [(0, K.jsx)(x, { className: `size-4` }), ` Funga`],
          }),
        ],
      }),
    })
  );
}
function ce({ amount: e, onClose: t, onUpgrade: upgrade, active = false }) {
  if (!active) return <ActivationRequiredDialog open onClose={t} />;
  return (0, K.jsx)(`div`, {
    className: `fixed inset-0 z-[80] flex items-center justify-center bg-overlay/60 p-4 backdrop-blur-sm`,
    children: (0, K.jsxs)(`div`, {
      className: `animate-pop-in card-soft relative w-full max-w-md overflow-hidden p-6`,
      children: [
        (0, K.jsx)(`button`, {
          onClick: t,
          "aria-label": `Funga`,
          className: `absolute right-3 top-3 rounded-full bg-muted p-2 text-muted-foreground transition hover:bg-destructive hover:text-destructive-foreground`,
          children: (0, K.jsx)(j, { className: `size-4` }),
        }),
        (0, K.jsx)(`div`, {
          className: `grad-profit mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl text-on-color`,
          children: (0, K.jsx)(E, { className: `size-7` }),
        }),
        (0, K.jsx)(`h3`, {
          className: `text-center text-lg font-bold`,
          children: active ? `Salio la ${I(e || 0)} limehifadhiwa; hakuna pesa halisi iliyotumwa.` : `Akaunti yako haijawa hai`,
        }),
        active ? (0, K.jsx)(`button`, {
          onClick: t,
          className: `grad-profit mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-on-color shadow-lg transition active:scale-95`,
          children: `Sawa`,
        }) : (0, K.jsxs)(K.Fragment, { children: [
          (0, K.jsxs)(`p`, {
            className: `mt-3 text-center text-sm leading-relaxed text-muted-foreground`,
            children: [`Huduma hii inahitaji akaunti iliyo hai (active account). Ada ya activation ni `, (0, K.jsx)(`span`, { className: `font-bold text-foreground`, children: `TZS 16,000` }), `. Jisajili sasa ili kutumia huduma ya mazungumzo. Salio na withdrawal ni mfano wa matumizi ya mfumo.`],
          }),
          (0, K.jsxs)(`a`, { href: L, className: `grad-withdraw mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-on-color shadow-lg transition active:scale-95`, children: [`Fungua na Activate Akaunti Hapa `, (0, K.jsx)(f, { className: `size-4` })] }),
        ]}),
      ],
    }),
  });
}
function le({
  canPrompt: e,
  platform: t,
  status: n,
  onInstall: r,
  onClose: i,
}) {
  return (0, K.jsx)(`div`, {
    className: `fixed inset-0 z-[85] flex items-end justify-center bg-overlay/60 p-0 backdrop-blur-sm sm:items-center sm:p-4`,
    children: (0, K.jsxs)(`div`, {
      className: `animate-pop-in card-soft relative w-full max-w-md overflow-hidden p-6 pb-8 sm:pb-6`,
      children: [
        (0, K.jsx)(`button`, {
          onClick: i,
          "aria-label": `Funga`,
          className: `absolute right-3 top-3 rounded-full bg-muted p-2 text-muted-foreground`,
          children: (0, K.jsx)(j, { className: `size-4` }),
        }),
        (0, K.jsx)(`img`, {
          src: logoAsset.url,
          alt: `Nembo ya Gochati`,
          width: 72,
          height: 72,
          className: `mx-auto size-18 rounded-2xl shadow-lg`,
        }),
        (0, K.jsx)(`h3`, {
          className: `mt-4 text-center text-lg font-black`,
          children: `Install Gochati App`,
        }),
        (0, K.jsx)(`p`, {
          className: `mt-1 text-center text-xs text-muted-foreground`,
          children: `Bonyeza hapa chini kuweka app kwenye home screen ya simu yako.`,
        }),
        n &&
          (0, K.jsxs)(`p`, {
            className: `mt-4 flex items-center justify-center gap-2 rounded-xl bg-success/10 px-3 py-2 text-center text-xs font-semibold text-success`,
            children: [(0, K.jsx)(m, { className: `size-4` }), ` `, n],
          }),
        e
          ? (0, K.jsxs)(`button`, {
              onClick: r,
              className: `grad-profit mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-on-color shadow-lg active:scale-95`,
              children: [
                (0, K.jsx)(g, { className: `size-4` }),
                ` Install Sasa`,
              ],
            })
          : (0, K.jsx)(`div`, {
              className: `mt-5 space-y-2 rounded-xl border border-border bg-secondary/60 p-4 text-xs font-semibold`,
              children:
                t === `ios`
                  ? (0, K.jsxs)(K.Fragment, {
                      children: [
                        (0, K.jsxs)(`p`, {
                          className: `flex items-center gap-2`,
                          children: [
                            `1. Bonyeza `,
                            (0, K.jsx)(T, { className: `size-4 text-primary` }),
                            ` (Share) chini ya Safari`,
                          ],
                        }),
                        (0, K.jsxs)(`p`, {
                          className: `flex items-center gap-2`,
                          children: [
                            `2. Chagua `,
                            (0, K.jsx)(C, { className: `size-4 text-primary` }),
                            ` "Add to Home Screen"`,
                          ],
                        }),
                        (0, K.jsx)(`p`, {
                          children: `3. Bonyeza "Add" — app itaingia kwenye simu yako.`,
                        }),
                      ],
                    })
                  : (0, K.jsxs)(K.Fragment, {
                      children: [
                        (0, K.jsxs)(`p`, {
                          className: `flex items-center gap-2`,
                          children: [
                            `1. Bonyeza `,
                            (0, K.jsx)(_, { className: `size-4 text-primary` }),
                            ` (menyu) juu ya kivinjari`,
                          ],
                        }),
                        (0, K.jsx)(`p`, {
                          children: `2. Chagua "Install app" au "Add to Home screen"`,
                        }),
                        (0, K.jsx)(`p`, {
                          children: `3. Thibitisha — Gochati itaingia kwenye home screen.`,
                        }),
                      ],
                    }),
            }),
      ],
    }),
  });
}
function ue() {
  try {
    let e = new (window.AudioContext || window.webkitAudioContext)();
    ([1318, 1046, 1568].forEach((t, n) => {
      let r = e.createOscillator(),
        i = e.createGain();
      ((r.type = `sine`),
        (r.frequency.value = t),
        i.gain.setValueAtTime(1e-4, e.currentTime + n * 0.16),
        i.gain.exponentialRampToValueAtTime(
          0.25,
          e.currentTime + n * 0.16 + 0.02,
        ),
        i.gain.exponentialRampToValueAtTime(
          1e-4,
          e.currentTime + n * 0.16 + 0.15,
        ),
        r.connect(i).connect(e.destination),
        r.start(e.currentTime + n * 0.16),
        r.stop(e.currentTime + n * 0.16 + 0.18));
    }),
      setTimeout(() => void e.close(), 900));
  } catch {}
}
function de() {
  let [e, t] = (0, l.useState)(!0),
    [n, r] = (0, l.useState)(0),
    [i, a] = (0, l.useState)(0),
    [o, s] = (0, l.useState)(null),
    [c, u] = (0, l.useState)(null),
    [d, f] = (0, l.useState)({ open: !1, amount: null }),
    [m, h] = (0, l.useState)(null),
    [_, y] = (0, l.useState)(null),
    [x, S] = (0, l.useState)([]),
    [C, w] = (0, l.useState)(0),
    T = (0, l.useRef)(null),
    [E, k] = (0, l.useState)(!1),
    [M, N] = (0, l.useState)(!1),
    [P, F] = (0, l.useState)(null),
    [V, H] = (0, l.useState)(`desktop`),
    [accountActive, setAccountActive] = (0, l.useState)(false),
    [accountReady, setAccountReady] = (0, l.useState)(false),
    [isPremium, setIsPremium] = (0, l.useState)(false),
    [isVip, setIsVip] = (0, l.useState)(false),
    [username, setUsername] = (0, l.useState)(""),
    [referralCount, setReferralCount] = (0, l.useState)(0),
    [notifications, setNotifications] = (0, l.useState)([]),
    [bannerNotification, setBannerNotification] = (0, l.useState)(null),
    [notificationOpen, setNotificationOpen] = (0, l.useState)(false);
  ((0, l.useEffect)(() => {
    document.documentElement.classList.toggle(`dark`, e);
  }, [e]),
    (0, l.useEffect)(() => {
      let mounted = true;
      const loadAccount = async () => {
        const { data: { user } } = await platform.auth.getUser();
        if (!user) { if (mounted) setAccountReady(true); return; }
        const { data } = await platform.from("gochati_users").select("account_status,activation_paid,is_premium,is_vip,referral_count,balance,net_income,username").eq("id", user.id).maybeSingle();
        if (mounted && data) { setAccountActive(data.account_status === "active" && !!data.activation_paid); setIsPremium(!!data.is_premium); setIsVip(!!data.is_vip); setReferralCount(Number(data.referral_count || 0)); setUsername(String(data.username || "")); const savedBalance = Number(data.balance || 0); r(Number(data.net_income || 0)); a(savedBalance); w(savedBalance); setAccountReady(true); }
      };
      void loadAccount();
      window.addEventListener("focus", loadAccount);
      const refresh = setInterval(loadAccount, 20000);
      return () => { mounted = false; clearInterval(refresh); window.removeEventListener("focus", loadAccount); };
    }, []),
    (0, l.useEffect)(() => {
      S(Array.from({ length: 8 }, () => W()));
      let e = navigator.userAgent;
      H(
        /iPhone|iPad|iPod/i.test(e)
          ? `ios`
          : /Android/i.test(e)
            ? `android`
            : `desktop`,
      );
    }, []),
    (0, l.useEffect)(() => {
      let e = (e) => {
          (e.preventDefault(), (T.current = e), k(!0));
        },
        t = () => {
          (k(!1), (T.current = null), F(`GoChati tayari imewekwa kwenye kifaa chako.`), N(!0));
        };
      if (window.matchMedia(`(display-mode: standalone)`).matches || navigator.standalone) {
        F(`GoChati tayari imewekwa kwenye kifaa chako.`);
      }
      window.addEventListener(`beforeinstallprompt`, e);
      window.addEventListener(`appinstalled`, t);
      if (`serviceWorker` in navigator) {
        navigator.serviceWorker.register(`/sw.js`, { scope: `/` }).catch(() => {
          F(`Usakinishaji wa moja kwa moja haujapatikana. Tumia menyu ya kivinjari kuweka GoChati kwenye home screen.`);
        });
      }
      return (
        () => {
          (window.removeEventListener(`beforeinstallprompt`, e),
            window.removeEventListener(`appinstalled`, t));
        }
      );
    }, []),
    (0, l.useEffect)(() => {
      let e = setInterval(() => {
        let e = W();
        (h(e),
          ue(),
          S((t) => [e, ...t].slice(0, 12)),
          setTimeout(() => h((t) => (t && t.id === e.id ? null : t)), 7e3));
      }, 15e3);
      return () => clearInterval(e);
    }, []));
  (0, l.useEffect)(() => {
    let mounted = true;
    let timer;
    const loadNotifications = async () => {
      const { data: { user } } = await platform.auth.getUser();
      if (!user) return;
      const { data } = await platform.from("gochati_notifications").select("id,message,created_at,read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      if (!mounted || !data) return;
      setNotifications(data);
      setBannerNotification(data[0] && !data[0].read_at ? data[0] : null);
    };
    void loadNotifications();
    timer = setInterval(() => void loadNotifications(), 20000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);
  const dismissNotification = async (id) => {
    await platform.from("gochati_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    setBannerNotification((current) => current?.id === id ? null : current);
  };
  let U = (0, l.useCallback)(async (e, sessionId = null) => {
      s(null);
      if (!accountActive) { f({ open: !0, amount: e }); return; }
      const { data: { user } } = await platform.auth.getUser();
      if (!user) { h({ id: `earned-error-${Date.now()}`, text: `Ingia kwenye akaunti yako ili kuhifadhi mapato.` }); setTimeout(() => h(null), 5000); return; }
      if (!sessionId) { h({ id: `earned-error-${Date.now()}`, text: `Kipindi hakikuthibitishwa. Mapato hayajaongezwa.` }); setTimeout(() => h(null), 7000); return; }
      const { data: savedBalance, error } = await platform.rpc("gochati_complete_earning_session", { p_session_id: sessionId });
      if (error) { h({ id: `earned-error-${Date.now()}`, text: `Mapato hayajaongezwa: ${error.message}` }); setTimeout(() => h(null), 7000); return; }
      const nextBalance = Number(savedBalance || 0);
      a(nextBalance); w(nextBalance);
      const { data: profile } = await platform.from("gochati_users").select("net_income").eq("id", user.id).single();
      if (profile) r(Number(profile.net_income || 0));
      f({ open: true, amount: e });
      setTimeout(() => h(null), 5000);
    }, [accountActive]),
    J = (e) => {
      if (!accountReady) return;
      if (!e.online) {
        (y(
          `${e.name} yupo Offline kwa sasa. Huwezi kuchati wala kulipwa mpaka awe Online.`,
        ),
          setTimeout(() => y(null), 4e3));
        return;
      }
      s(e);
    },
    Y = async () => {
      N(!0);
      if (window.matchMedia(`(display-mode: standalone)`).matches || navigator.standalone) {
        F(`GoChati tayari imewekwa kwenye kifaa chako.`);
        return;
      }
      if (!T.current) {
        return;
      }
      const installPrompt = T.current;
      T.current = null;
      k(!1);
      try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        F(choice.outcome === `accepted`
          ? `Ombi la kusakinisha GoChati limekubaliwa. Thibitisha kwenye kifaa chako.`
          : `Usakinishaji umeghairiwa. Unaweza kutumia menyu ya kivinjari kusakinisha GoChati.`);
      } catch {
        F(`Usakinishaji haujakamilika. Tumia menyu ya kivinjari kusakinisha GoChati.`);
      }
    };
  return (0, K.jsxs)(`main`, {
    className: `min-h-screen bg-background pb-10`,
    children: [
      m &&
        (0, K.jsx)(`div`, {
          className: `fixed left-1/2 top-3 z-[90] w-[94%] max-w-md -translate-x-1/2`,
          children: (0, K.jsxs)(`div`, {
            className: `animate-pop-in grad-balance flex items-start gap-3 rounded-2xl p-3.5 text-on-color shadow-2xl`,
            children: [
              (0, K.jsx)(p, {
                className: `mt-0.5 size-5 shrink-0 animate-lop`,
              }),
              (0, K.jsx)(`p`, {
                className: `flex-1 text-xs font-semibold leading-snug`,
                children: m.text,
              }),
              (0, K.jsx)(`button`, {
                onClick: () => h(null),
                "aria-label": `Funga`,
                children: (0, K.jsx)(j, { className: `size-4` }),
              }),
            ],
          }),
        }),
      _ &&
        (0, K.jsx)(`div`, {
          className: `fixed bottom-4 left-1/2 z-[95] w-[92%] max-w-sm -translate-x-1/2 rounded-xl bg-foreground px-4 py-3 text-center text-xs font-semibold text-background shadow-xl`,
          children: _,
        }),
      (0, K.jsxs)(`div`, {
        className: `mx-auto max-w-3xl px-4`,
        children: [
          (0, K.jsxs)(`header`, {
            className: `flex items-center gap-3 py-5`,
            children: [
              (0, K.jsx)(`img`, {
                src: logoAsset.url,
                alt: `Nembo ya Gochati`,
                width: 44,
                height: 44,
                className: `size-11 rounded-2xl shadow-md`,
              }),
              (0, K.jsxs)(`div`, {
                className: `flex-1`,
                children: [
                  (0, K.jsx)(`h1`, {
                    className: `text-2xl font-black tracking-normal`,
                    children: `gochati.online`,
                  }),
                  (isVip || isPremium) && (0, K.jsx)(`span`, { className: `inline-flex mt-1 rounded-full px-3 py-1 text-xs font-black ${isVip ? `vip-diamond-badge` : `border border-amber-300 bg-amber-100 text-amber-800`}`, children: isVip ? `◆ VIP ACCOUNT` : `✦ PREMIUM ACCOUNT` }),
                  (0, K.jsx)(`p`, {
                    className: `text-[11px] text-muted-foreground`,
                    children: `Chati • Lipwa • Toa Pesa`,
                  }),
                ],
              }),
              (0, K.jsx)(`button`, {
                onClick: () => t((e) => !e),
                "aria-label": `Badili mwonekano`,
                className: `rounded-xl border border-border bg-card p-2.5`,
                children: e
                  ? (0, K.jsx)(O, { className: `size-5` })
                  : (0, K.jsx)(ee, { className: `size-5` }),
              }),
              (0, K.jsxs)(`button`, {
                onClick: () => setNotificationOpen(true),
                "aria-label": `Notifications`,
                className: `relative rounded-xl border border-border bg-card p-2.5`,
                children: [ (0, K.jsx)(p, { className: `size-5` }), notifications.some((item) => !item.read_at) && (0, K.jsx)(`span`, { className: `absolute -right-1 -top-1 size-2.5 rounded-full bg-red-500` }) ],
              }),
            ],
          }),
          (0, K.jsxs)(`div`, {
            className: `grid grid-cols-2 gap-3`,
            children: [
              (0, K.jsxs)(`button`, {
                onClick: Y,
                className: `grad-profit flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-bold text-on-color shadow-lg`,
                children: [
                  (0, K.jsx)(g, { className: `size-4` }),
                  ` Download Gochati App`,
                  E &&
                    (0, K.jsx)(`span`, {
                      className: `size-2 animate-ping rounded-full bg-on-color`,
                    }),
                ],
              }),
              (0, K.jsxs)(`button`, {
                onClick: () => document.querySelector('[aria-label="Customer services"]')?.click(),
                type: `button`,
                className: `grad-withdraw flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-bold text-on-color shadow-lg`,
                children: [
                  (0, K.jsx)(v, { className: `size-4` }),
                  ` Customer Service`,
                ],
              }),
            ],
          }),
          (0, K.jsxs)(`div`, {
            className: `mt-4 flex items-center justify-center gap-2 rounded-full border border-success/30 bg-success/10 py-2 text-xs font-semibold text-success`,
            children: [
              (0, K.jsx)(`span`, {
                className: `size-2.5 animate-ping rounded-full bg-success`,
              }),
              `Wazungu 3,490 wapo mtandaoni`,
            ],
          }),
          bannerNotification && (0, K.jsxs)(`div`, {
            className: `mt-3 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4`,
            children: [
              (0, K.jsx)(p, { className: `mt-0.5 size-5 shrink-0 text-primary` }),
              (0, K.jsx)(`p`, { className: `flex-1 text-sm font-semibold`, children: bannerNotification.message }),
              (0, K.jsx)(`button`, { onClick: () => void dismissNotification(bannerNotification.id), className: `rounded-lg p-1 text-muted-foreground`, "aria-label": `Funga notification`, children: (0, K.jsx)(j, { className: `size-4` }) }),
            ],
          }),
          (0, K.jsxs)(`section`, {
            className: `mt-4 grid grid-cols-3 gap-2 sm:gap-3`,
            children: [
              (0, K.jsx)($, {
                grad: isVip ? `vip-diamond` : isPremium ? `premium-gold` : `grad-emerald`,
                icon: (0, K.jsx)(te, { className: `size-5` }),
                label: `Net Income`,
                value: I(n),
              }),
              (0, K.jsx)($, {
                grad: isVip ? `vip-diamond` : isPremium ? `premium-gold` : `grad-royal`,
                icon: (0, K.jsx)(A, { className: `size-5` }),
                label: `Balance`,
                value: I(i),
              }),
              (0, K.jsxs)(`div`, {
                className: `${isVip ? `vip-diamond` : isPremium ? `premium-gold` : `grad-sunset`} flex min-h-[132px] flex-col justify-between rounded-2xl p-3 text-on-color shadow-lg sm:p-4`,
                children: [
                  (0, K.jsxs)(`div`, {
                    className: `flex items-center gap-1.5 text-[11px] font-semibold opacity-90 sm:text-xs`,
                    children: [
                      (0, K.jsx)(g, { className: `size-4 sm:size-5` }),
                      ` Withdrawal`,
                    ],
                  }),
                  (0, K.jsx)(`p`, {
                    className: `text-sm font-black sm:text-xl`,
                    children: I(C),
                  }),
                  (0, K.jsx)(`button`, {
                    disabled: !accountReady,
                    onClick: () => { if (!accountActive) { f({ open: !0, amount: null }); return; } window.location.href = "/withdrawal"; },
                    className: `rounded-xl bg-overlay/30 px-2 py-2 text-[11px] font-bold sm:text-xs`,
                    children: `Toa Pesa`,
                  }),
                ],
              }),
            ],
          }),
          accountReady && !accountActive && (0, K.jsxs)(`a`, {
            href: L,
            className: `grad-brand mt-3 flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-on-color shadow-lg`,
            children: [
              (0, K.jsx)(ne, { className: `size-4` }),
              ` Fungua Account Hapa`,
            ],
          }),
          (0, K.jsxs)(`section`, {
            className: `mt-7`,
            children: [
              (0, K.jsx)(`h2`, {
                className: `mb-3 text-lg font-bold`,
                children: `Chagua Mzungu wa Kuchati Naye`,
              }),
              (0, K.jsx)(`div`, {
                className: `flex flex-col gap-3`,
                children: re.map((e) =>
                  (0, K.jsx)(
                    q,
                    {
                      person: e,
                      onChat: () => J(e),
                      onCall: (t) => u({ person: e, kind: t }),
                    },
                    e.id,
                  ),
                ),
              }),
            ],
          }),
          (0, K.jsxs)(`section`, {
            className: `mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2`,
            children: [
              (0, K.jsxs)(`div`, {
                className: `card-soft grad-balance p-4 text-on-color`,
                children: [
                  (0, K.jsx)(`h3`, {
                    className: `text-sm font-black`,
                    children: `Download Gochati App`,
                  }),
                  (0, K.jsx)(`p`, {
                    className: `mt-1 text-[11px] opacity-90`,
                    children: `Weka app kwenye home screen ya simu yako.`,
                  }),
                  (0, K.jsxs)(`button`, {
                    onClick: Y,
                    className: `mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-overlay/30 px-3 py-2.5 text-xs font-bold`,
                    children: [
                      (0, K.jsx)(g, { className: `size-4` }),
                      ` Download App`,
                    ],
                  }),
                ],
              }),
              (0, K.jsxs)(`div`, {
                className: `card-soft grad-profit p-4 text-on-color`,
                children: [
                  (0, K.jsxs)(`div`, {
                    className: `flex items-center gap-2`,
                    children: [
                      (0, K.jsx)(`span`, {
                        className: `animate-lop text-2xl`,
                        children: `💬`,
                      }),
                      (0, K.jsx)(`h3`, {
                        className: `text-sm font-black`,
                        children: `Huduma kwa Wateja`,
                      }),
                    ],
                  }),
                  (0, K.jsxs)(`div`, {
                    className: `mt-3 grid gap-2`,
                    children: [
                      (0, K.jsxs)(`a`, {
                        href: `sms:${B}`,
                        className: `flex items-center justify-center gap-2 rounded-xl bg-overlay/40 px-3 py-2.5 text-center text-xs font-bold`,
                        children: [
                          (0, K.jsx)(b, { className: `size-4` }),
                          ` Tuma SMS: `,
                          B,
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          (0, K.jsx)(`section`, {
            className: `mt-8 overflow-hidden rounded-2xl border border-border bg-card py-3`,
            children: (0, K.jsx)(`div`, {
              className: `animate-marquee flex w-max gap-8 whitespace-nowrap`,
              children: [...x, ...x].map((e, t) =>
                (0, K.jsxs)(
                  `span`,
                  {
                    className: `text-xs font-semibold text-success`,
                    children: [`✅ `, e.text],
                  },
                  e.id + t,
                ),
              ),
            }),
          }),
          (0, K.jsxs)(`section`, {
            className: `mt-8`,
            children: [
              (0, K.jsx)(`h2`, {
                className: `mb-3 text-lg font-bold`,
                children: `Maoni ya Watumiaji`,
              }),
              (0, K.jsx)(`div`, {
                className: `grid gap-3`,
                children: G.map((e) =>
                  (0, K.jsxs)(
                    `div`,
                    {
                      className: `card-soft p-4`,
                      children: [
                        (0, K.jsx)(`div`, {
                          className: `flex items-center gap-1 text-gold`,
                          children: Array.from({ length: e.stars }).map(
                            (e, t) =>
                              (0, K.jsx)(
                                D,
                                { className: `size-4 fill-current` },
                                t,
                              ),
                          ),
                        }),
                        (0, K.jsx)(`p`, {
                          className: `mt-2 text-sm`,
                          children: e.text,
                        }),
                        (0, K.jsxs)(`p`, {
                          className: `mt-2 text-xs font-semibold text-muted-foreground`,
                          children: [e.name, ` — `, e.place],
                        }),
                      ],
                    },
                    e.name,
                  ),
                ),
              }),
            ],
          }),
          (0, K.jsxs)(`section`, {
            className: `mt-8`,
            children: [
              (0, K.jsx)(`h2`, {
                className: `mb-3 text-sm font-bold text-muted-foreground`,
                children: `Miamala ya Waliotoa Pesa`,
              }),
              (0, K.jsx)(`div`, {
                className: `card-soft h-40 overflow-hidden p-3`,
                children: (0, K.jsx)(`div`, {
                  className: `animate-ticker space-y-2`,
                  children: [...x, ...x].map((e, t) =>
                    (0, K.jsxs)(
                      `p`,
                      {
                        className: `rounded-lg bg-secondary px-3 py-2 text-[11px] font-semibold`,
                        children: [`💸 `, e.text],
                      },
                      e.id + `v` + t,
                    ),
                  ),
                }),
              }),
            ],
          }),
        ],
      }),
      notificationOpen && (0, K.jsx)(`div`, { className: `fixed inset-0 z-[100] flex items-center justify-center bg-overlay/70 p-4`, onMouseDown: (event) => { if (event.target === event.currentTarget) setNotificationOpen(false); }, children: (0, K.jsxs)(`section`, { role: `dialog`, "aria-modal": true, "aria-label": `Notifications`, className: `card-soft max-h-[80vh] w-full max-w-lg overflow-y-auto p-5`, children: [ (0, K.jsxs)(`div`, { className: `mb-4 flex items-center justify-between gap-3`, children: [ (0, K.jsx)(`h2`, { className: `text-xl font-black`, children: `Notifications` }), (0, K.jsx)(`button`, { onClick: () => setNotificationOpen(false), "aria-label": `Funga`, className: `rounded-lg p-2`, children: (0, K.jsx)(j, { className: `size-5` }) }) ] }), notifications.length ? notifications.map((item) => (0, K.jsxs)(`article`, { className: `mb-3 rounded-xl border border-border p-3`, children: [ (0, K.jsx)(`p`, { className: `text-sm`, children: item.message }), (0, K.jsx)(`p`, { className: `mt-2 text-xs text-muted-foreground`, children: new Date(item.created_at).toLocaleString() }), !item.read_at && (0, K.jsx)(`button`, { onClick: () => void dismissNotification(item.id), className: `mt-2 text-xs font-bold text-primary`, children: `Dismiss` }) ] }, item.id)) : (0, K.jsx)(`p`, { className: `text-sm text-muted-foreground`, children: `Bado hakuna notification.` }) ] }) }),
      o && (0, K.jsx)(oe, { person: o, active: accountActive, onClose: () => s(null), onPaid: U }),
      c &&
        (0, K.jsx)(se, {
          person: c.person,
          kind: c.kind,
          active: accountActive,
          onClose: () => u(null),
        }),
      M &&
        (0, K.jsx)(le, {
          canPrompt: E,
          platform: V,
          status: P,
          onInstall: Y,
          onClose: () => {
            (N(!1), F(null));
          },
        }),
      d.open &&
        (0, K.jsx)(ce, {
          amount: d.amount,
          active: accountActive,
          onClose: () => f({ open: !1, amount: null }),
        }),
    ],
  });
}
function $({ grad: e, icon: t, label: n, value: r }) {
  return (0, K.jsxs)(`div`, {
    className: `${e} flex min-h-[132px] flex-col justify-between rounded-2xl p-3 text-on-color shadow-lg sm:p-4`,
    children: [
      (0, K.jsxs)(`div`, {
        className: `flex items-center gap-1.5 text-[11px] font-semibold opacity-90 sm:text-xs`,
        children: [t, ` `, n],
      }),
      (0, K.jsx)(`p`, {
        className: `text-sm font-black sm:text-xl`,
        children: r,
      }),
      (0, K.jsx)(`p`, {
        className: `text-[9px] opacity-80 sm:text-[10px]`,
        children: `Inaongezeka baada ya kuchati`,
      }),
    ],
  });
}
export { de as Gochati, oe as ChatSession, se as CallDialog };
