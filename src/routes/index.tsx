import { createFileRoute, Link } from "@tanstack/react-router";
import { Gochati } from "@/components/gochati/Gochati";
import support from "@/assets/support.jpg";
import { AboutGochati } from "@/components/gochati/AboutGochati";

export const Route = createFileRoute("/")({
 head: () => ({ links: [{ rel: "canonical", href: "https://gochati.site/" }], meta: [
  { title: "Gochati — Mazungumzo na Wageni" },
  { name: "description", content: "Gochati ni jukwaa la kuchati na wageni kutoka nje ya nchi, kujifunza na kufurahia mazungumzo ya kimataifa." },
  { name: "keywords", content: "Gochati, Gochati, kuchati na wageni, chat na kulipwa" },
  { name: "robots", content: "index, follow, max-image-preview:large" },
  { property: "og:title", content: "Gochati — Mazungumzo ya Mtandaoni" },
  { property: "og:description", content: "Furahia mazungumzo ya majaribio na ujifunze kuhusu tamaduni." },
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://gochati.site/" },
  { property: "og:site_name", content: "Gochati" },
  { name: "twitter:card", content: "summary_large_image" },
 ] }),
 component: () => <><Gochati /><footer className="mx-auto mt-8 mb-24 max-w-5xl px-5 py-8"><AboutGochati /><nav aria-label="Viungo vya taarifa" className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground"><Link to="/about" className="underline">Kuhusu Gochati</Link><Link to="/terms" className="underline">Masharti ya matumizi</Link></nav><p className="mt-4 text-sm text-muted-foreground">© {new Date().getFullYear()} Gochati. Haki zote zimehifadhiwa.</p></footer><a href="sms:0743871339?body=Nielekeze%20kuhusu%20Gochati" aria-label="Tuma SMS kwa huduma kwa wateja" title="Tuma SMS kwa huduma kwa wateja" className="gochat-float fixed bottom-5 right-5 z-50 block overflow-hidden rounded-full border-2 border-primary shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><img src={support} alt="Msaidizi wa Gochati" width={56} height={56} className="size-14 object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/avators/women-10.jpg"; }} /></a></>,
});
