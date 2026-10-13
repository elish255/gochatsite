import { createFileRoute } from "@tanstack/react-router";
import { Chatdunia } from "@/components/chatdunia/Chatdunia";
import support from "@/assets/support.jpg";

export const Route = createFileRoute("/")({
 head: () => ({ links: [{ rel: "canonical", href: "https://gochati.site/" }], meta: [
  { title: "Gochat.site — Chati na Wageni Ulipwe Papo Hapo" },
  { name: "description", content: "Gochat.site ni jukwaa la kuchati na wageni kutoka nje ya nchi, kujifunza na kufurahia mazungumzo ya kimataifa." },
  { name: "keywords", content: "Gochat.site, Gochat, kuchati na wageni, chat na kulipwa" },
  { name: "robots", content: "index, follow, max-image-preview:large" },
  { property: "og:title", content: "Gochat.site — Chati Ulipwe Papo Hapo" },
  { property: "og:description", content: "Chagua mzungu, chati kwa dakika chache, na malipo yaingie kwenye salio lako." },
  { property: "og:type", content: "website" },
  { property: "og:url", content: "https://gochati.site/" },
  { property: "og:site_name", content: "Gochat.site" },
  { name: "twitter:card", content: "summary_large_image" },
 ] }),
 component: () => <><Chatdunia /><a href="sms:0743871339?body=Nielekeze%20kuhusu%20Gochat.site" aria-label="Msaada wa Gochat.site" title="Msaada wa Gochat.site" className="gochat-float fixed bottom-5 right-5 z-50 block overflow-hidden rounded-full border-2 border-primary shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><img src={support} alt="Msaidizi wa Gochat.site" width={56} height={56} className="size-14 object-cover" /></a></>,
});
