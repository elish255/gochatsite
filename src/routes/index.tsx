import { createFileRoute } from "@tanstack/react-router";
import { Gotchati } from "@/components/gotchati/Gotchati";
import support from "@/assets/support.jpg";

export const Route = createFileRoute("/")({
 head: () => ({ links: [{ rel: "canonical", href: "https://gochati.site/" }], meta: [
  { title: "Gotchati — Chati na Wageni Ulipwe Papo Hapo" },
  { name: "description", content: "Gotchati ni jukwaa la kuchati na wageni kutoka nje ya nchi, kujifunza na kufurahia mazungumzo ya kimataifa." },
  { name: "keywords", content: "Gotchati, Gotchati, kuchati na wageni, chat na kulipwa" },
  { name: "robots", content: "index, follow, max-image-preview:large" },
  { property: "og:title", content: "Gotchati — Chati Ulipwe Papo Hapo" },
  { property: "og:description", content: "Chagua mzungu, chati kwa dakika chache, na malipo yaingie kwenye salio lako." },
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://gochati.site/" },
  { property: "og:site_name", content: "Gotchati" },
  { name: "twitter:card", content: "summary_large_image" },
 ] }),
 component: () => <><Gotchati /><a href="tel:+255743871339" aria-label="Msaada wa Gotchati" title="Msaada wa Gotchati" className="gochat-float fixed bottom-5 right-5 z-50 block overflow-hidden rounded-full border-2 border-primary shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><img src={support} alt="Msaidizi wa Gotchati" width={56} height={56} className="size-14 object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/avators/women-10.jpg"; }} /></a></>,
});
