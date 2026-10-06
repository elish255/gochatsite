import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Search, SlidersHorizontal, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GochatShell } from "@/components/gochat-shell";
import { money, people } from "@/lib/gochat-data";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Gochat — Chat na Wageni, Jifunze na Gundua Fursa" },
    { name: "description", content: "Gochat inakuunganisha na watu duniani kwa mazungumzo, lugha na utamaduni. Angalia wazungumzaji na anza gumzo." },
    { property: "og:title", content: "Gochat — Chat na Wageni" },
    { property: "og:description", content: "Chagua mtu wa kuzungumza naye na ugundue mazungumzo ya lugha, utamaduni na fursa za mtandaoni." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

function shuffle<T>(items: T[]): T[] {
  return items
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function Index() {
  const [order, setOrder] = useState(people);
  useEffect(() => {
    setOrder(shuffle(people));
    const timer = setInterval(() => { setOrder(shuffle(people)); setPage(1); }, 60_000);
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
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-12 md:grid-cols-[1.15fr_.85fr] md:items-center md:px-6 md:pb-14 md:pt-16">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-primary/20 bg-background px-3 py-1.5 text-xs font-bold text-primary"><span className="size-2 rounded-full bg-primary"/> MAZUNGUMZO YANAENDELEA SASA</div>
          <h1 className="font-display max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl">Chat na wageni.<br/><span className="text-primary">Fungua dunia mpya.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">Chagua mtu wa kuzungumza naye, badilishana lugha na utamaduni, na gundua fursa za mtandaoni ukiwa Tanzania.</p>
          <Button size="lg" className="mt-7" asChild><a href="#watu">Chagua wa kuchat naye <ArrowRight/></a></Button>
          <div className="mt-8 flex items-center gap-5 border-t border-border pt-5 text-sm"><div><strong className="font-display text-xl">12</strong><span className="ml-1.5 text-muted-foreground">wasifu</span></div><div className="h-6 w-px bg-border"/><div className="flex items-center gap-1.5 text-muted-foreground"><Users size={17} className="text-primary"/> Mazungumzo mbalimbali</div></div>
        </div>
        <div className="hidden md:block">
          <div className="grid grid-cols-2 gap-3">
            {order.slice(0, 4).map((person, index) => <Link key={person.id} to="/chat/$personId" params={{ personId: person.id }} className={`group relative overflow-hidden rounded-md ${index === 1 || index === 3 ? "translate-y-6" : ""}`}><img src={person.image} alt={person.name} className="aspect-[4/4.3] w-full object-cover transition-transform duration-300 group-hover:scale-105"/><div className="absolute inset-x-0 bottom-0 bg-overlay px-3 py-2 text-primary-foreground"><span className="font-display font-bold">{person.name}</span><span className="ml-2 text-xs">● Online</span></div></Link>)}
          </div>
        </div>
      </div>
    </section>
    <main id="watu" className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-primary">GUMZO LINAANZA HAPA</p><h2 className="mt-1 font-display text-3xl font-bold">Chagua mtu wa kuchat naye</h2></div><span className="text-sm text-muted-foreground">{filtered.length} wamepatikana</span></div>
      <div className="mb-5 flex flex-wrap gap-3"><label className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><span className="sr-only">Tafuta mtu au mada</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tafuta mtu au mada..." className="h-11 w-full rounded-md border border-input bg-card pl-10 pr-3 text-sm outline-none focus:border-primary" /></label><div className="flex items-center gap-2 overflow-x-auto"><SlidersHorizontal className="hidden size-4 text-muted-foreground sm:block"/>{topics.map((topic) => <Button key={topic} size="sm" variant={filter === topic ? "default" : "outline"} onClick={() => { setFilter(topic); setPage(1); }}>{topic}</Button>)}</div></div>
      {visible.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((person) => <article key={person.id} className="flex flex-col rounded-md border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-center gap-3"><div className="relative shrink-0"><img src={person.image} alt={`Picha ya ${person.name}`} width={72} height={72} loading="lazy" className="size-16 rounded-md object-cover"/><span className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-card bg-primary"/></div><div className="min-w-0"><h3 className="font-display text-xl font-bold">{person.name}</h3><p className="text-xs font-semibold text-primary">● Online sasa</p><p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Star size={12} className="fill-accent text-accent"/> {person.rating} · {person.minutes} dakika</p></div></div><p className="mt-5 text-xs font-bold uppercase text-muted-foreground">ANAPENDA KUZUNGUMZIA</p><p className="mt-1 min-h-12 text-sm font-medium">{person.topic}</p><div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-4"><div><p className="font-display text-lg font-bold text-primary">{money(person.amount)}</p></div><Button size="sm" asChild><Link to="/chat/$personId" params={{ personId: person.id }}>Anza chat <ArrowRight/></Link></Button></div></article>)}</div> : <div className="py-20 text-center text-muted-foreground">Hakuna mtu aliyepatikana. Jaribu jina au mada nyingine.</div>}
      <div className="mt-8 flex items-center justify-center gap-4"><Button variant="outline" size="icon" aria-label="Ukurasa uliopita" onClick={() => { setPage(Math.max(1, page - 1)); document.getElementById("watu")?.scrollIntoView(); }} disabled={page === 1}><ChevronLeft/></Button><span className="text-sm font-semibold">Ukurasa {page} / {totalPages}</span><Button variant="outline" size="icon" aria-label="Ukurasa unaofuata" onClick={() => { setPage(Math.min(totalPages, page + 1)); document.getElementById("watu")?.scrollIntoView(); }} disabled={page === totalPages}><ChevronRight/></Button></div>
    </main>
  </GochatShell>;
}