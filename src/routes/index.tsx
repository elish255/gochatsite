import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, CreditCard, Landmark, Search, SlidersHorizontal, Star, TrendingUp, Users, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GochatShell } from "@/components/gochat-shell";
import { money, people } from "@/lib/gochat-data";

const registrationUrl = "https://moxeraagencies.com/register?ref=Mtukazi";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Gochati.site — Chat na Wageni, Fungua Dunia mpya" },
    { name: "description", content: "Gochati.site inakuunganisha na watu duniani kwa mazungumzo, lugha na utamaduni. Chagua mtu wa kuchat naye na fungua dunia mpya." },
    { property: "og:title", content: "Gochati.site — Chat na Wageni" },
    { property: "og:description", content: "Chat na Wageni, Fungua Dunia mpya." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function shuffle<T>(items: T[]): T[] {
  return items.map((item) => ({ item, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ item }) => item);
}

function Index() {
  const [order, setOrder] = useState(people);
  useEffect(() => {
    setOrder(shuffle(people));
    const timer = setInterval(() => setOrder(shuffle(people)), 60_000);
    return () => clearInterval(timer);
  }, []);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Wote");
  const [page, setPage] = useState(1);
  const topics = ["Wote", "Utamaduni", "Kujifunza", "Burudani"];
  const filtered = useMemo(() => order.filter((person) => {
    const matchesQuery = `${person.name} ${person.topic}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesFilter = filter === "Wote" || (filter === "Utamaduni" ? /utamaduni|historia|safari|vyakula|Kiswahili/i : filter === "Kujifunza" ? /mtandaoni|uwekezaji|akiba|mazoezi|Kiswahili/i : /ngoma|michezo|mpira|sanaa|mitindo/i).test(person.topic);
    return matchesQuery && matchesFilter;
  }), [query, filter, order]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / 6));
  const visible = filtered.slice((page - 1) * 6, page * 6);

  return <GochatShell>
    <section className="relative overflow-hidden border-b border-border bg-secondary/65">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-7 md:px-6 md:pb-14 md:pt-10">
        <div className="rounded-2xl border border-border bg-background/80 p-4 shadow-sm md:p-5">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"><span className="size-3 shrink-0 rounded-full bg-green-500"/><Users className="size-5 text-primary"/><span className="font-display text-base font-bold md:text-xl">Wazungu <span className="text-primary">3490</span> wapo mtandaoni</span></div>
          <div className="gochat-stats-grid mt-4">
            <div className="gochat-stat-card bg-blue-500 text-white"><div className="flex min-w-0 items-center gap-1.5 font-semibold"><TrendingUp className="size-4 shrink-0"/> <span>Mapato Yote</span></div><p className="mt-2 font-display font-extrabold">TZS 0</p></div>
            <div className="gochat-stat-card bg-teal-500 text-white"><div className="flex min-w-0 items-center gap-1.5 font-semibold"><WalletCards className="size-4 shrink-0"/> <span>Salio la Sasa</span></div><p className="mt-2 font-display font-extrabold">TZS 0</p><Button className="mt-2 h-7 w-full rounded-full bg-white/90 px-1.5 text-[10px] font-bold text-teal-700 hover:bg-white" asChild><a href={registrationUrl}>Toa Pesa</a></Button></div>
            <div className="gochat-stat-card bg-emerald-600 text-white"><div className="flex min-w-0 items-center gap-1.5 font-semibold"><CreditCard className="size-4 shrink-0"/> <span>Pesa Iliyotolewa</span></div><p className="mt-2 font-display font-extrabold">TZS 0</p></div>
          </div>
          <Button size="lg" className="mt-4 h-14 w-full rounded-2xl bg-gradient-to-r from-blue-500 to-teal-500 text-base font-extrabold shadow-md hover:opacity-95" asChild><a href={registrationUrl}>Fungua Account Hapa <ArrowRight/></a></Button>
          <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-extrabold md:text-2xl">👉 Njia Rahisi za kutoa pesa (Withdraw) zako Automatically</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {[["Mpesa", CreditCard], ["Mixx by Yas", CreditCard], ["Halopesa", CreditCard], ["Airtel Money", CreditCard], ["NMB", Landmark], ["CRDB", Landmark]].map(([label, Icon]) => { const IconComponent = Icon as typeof CreditCard; return <span key={String(label)} className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2.5 font-semibold text-slate-700"><IconComponent className="size-5"/> {String(label)}</span>; })}
            </div>
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-primary/10 bg-background px-5 py-8 text-center shadow-sm md:px-10 md:py-12">
          <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl">Chat na Wageni,<br/><span className="text-primary">Fungua Dunia mpya.</span></h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">Chagua mtu wa kuzungumza naye, badilishana lugha na utamaduni, na gundua fursa za mtandaoni ukiwa Tanzania.</p>
          <Button size="lg" className="mt-6" asChild><a href="#watu">Chagua wa kuchat naye <ArrowRight/></a></Button>
        </div>
      </div>
    </section>

    <main id="watu" className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-primary">GUMZO LINAANZA HAPA</p><h2 className="mt-1 font-display text-3xl font-bold">Chagua mtu wa kuchat naye</h2></div></div>
      <div className="mb-5 flex flex-wrap gap-3"><label className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><span className="sr-only">Tafuta mtu au mada</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tafuta mtu au mada..." className="h-11 w-full rounded-md border border-input bg-card pl-10 pr-3 text-sm outline-none focus:border-primary" /></label><div className="flex items-center gap-2 overflow-x-auto"><SlidersHorizontal className="hidden size-4 text-muted-foreground sm:block"/>{topics.map((topic) => <Button key={topic} size="sm" variant={filter === topic ? "default" : "outline"} onClick={() => { setFilter(topic); setPage(1); }}>{topic}</Button>)}</div></div>
      {visible.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((person) => <article key={person.id} className="flex flex-col rounded-md border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-center gap-3"><div className="relative shrink-0"><img src={person.image} alt={`Picha ya ${person.name}`} width={72} height={72} loading="lazy" className="size-16 rounded-md object-cover"/><span className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-card bg-primary"/></div><div className="min-w-0"><h3 className="font-display text-xl font-bold">{person.name}</h3><p className="text-xs font-semibold text-primary">● Online sasa</p><p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Star size={12} className="fill-accent text-accent"/> {person.rating} · {person.minutes} dakika</p></div></div><p className="mt-5 text-xs font-bold uppercase text-muted-foreground">ANAPENDA KUZUNGUMZIA</p><p className="mt-1 min-h-12 text-sm font-medium">{person.topic}</p><div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-4"><div><p className="font-display text-lg font-bold text-primary">{money(person.amount)}</p></div><Button size="sm" asChild><Link to="/chat/$personId" params={{ personId: person.id }}>Anza chat <ArrowRight/></Link></Button></div></article>)}</div> : <div className="py-20 text-center text-muted-foreground">Hakuna mtu aliyepatikana. Jaribu jina au mada nyingine.</div>}
      <div className="mt-8 flex items-center justify-center gap-4"><Button variant="outline" size="icon" aria-label="Ukurasa uliopita" onClick={() => { setPage(Math.max(1, page - 1)); document.getElementById("watu")?.scrollIntoView(); }} disabled={page === 1}><ChevronLeft/></Button><span className="text-sm font-semibold">Ukurasa {page} / {totalPages}</span><Button variant="outline" size="icon" aria-label="Ukurasa unaofuata" onClick={() => { setPage(Math.min(totalPages, page + 1)); document.getElementById("watu")?.scrollIntoView(); }} disabled={page === totalPages}><ChevronRight/></Button></div>
    </main>
  </GochatShell>;
}
