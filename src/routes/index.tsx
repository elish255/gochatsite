import { createFileRoute, Link } from "@tanstack/react-router";
import { Gochati } from "@/components/gochati/Gochati";
import { SupportButton } from "@/components/gochati/SupportButton";
import { AboutGochati } from "@/components/gochati/AboutGochati";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://gochati.online/" }],
    meta: [
      { title: "Gochati.Online — Chat na Wageni, Fungua Dunia mpya" },
      {
        name: "description",
        content:
          "Gochati.online inakuunganisha na watu duniani kwa mazungumzo, lugha na utamaduni. Chagua mtu wa kuchat naye na fungua dunia mpya.",
      },
      { name: "keywords", content: "Gochati.online, chat na wageni, lugha, utamaduni" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:title", content: "Gochati.Online — Chat na Wageni, Fungua Dunia mpya" },
      { property: "og:description", content: "Gochati.online inakuunganisha na watu duniani kwa mazungumzo, lugha na utamaduni. Chagua mtu wa kuchat naye na fungua dunia mpya." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://gochati.online/" },
      { property: "og:site_name", content: "Gochati.online" },
      { property: "og:image", content: "https://gochati.online/gochat/brand-original.png" },
      { property: "og:image:alt", content: "Nembo ya Gochati.online" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Gochati.Online — Chat na Wageni, Fungua Dunia mpya" },
      { name: "twitter:description", content: "Gochati.online inakuunganisha na watu duniani kwa mazungumzo, lugha na utamaduni. Chagua mtu wa kuchat naye na fungua dunia mpya." },
      { name: "twitter:image", content: "https://gochati.online/gochat/brand-original.png" },
    ],
  }),
  component: () => (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Gochati.online",
        alternateName: "Gochati",
        url: "https://gochati.online/",
        inLanguage: "sw",
        description: "Gochati.online inakuunganisha na watu duniani kwa mazungumzo, lugha na utamaduni. Chagua mtu wa kuchat naye na fungua dunia mpya.",
        publisher: {
          "@type": "Organization",
          name: "Gochati.online",
          url: "https://gochati.online/",
          logo: "https://gochati.online/gochat/logo.png",
        },
      }) }} />
      <Gochati />
      <footer className="mx-auto mt-8 mb-24 max-w-5xl px-5 py-8">
        <AboutGochati />
        <nav
          aria-label="Viungo vya taarifa"
          className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground"
        >
          <Link to="/about" className="underline">
            Kuhusu Gochati
          </Link>
          <Link to="/terms" className="underline">
            Masharti ya matumizi
          </Link>
        </nav>
        <p className="mt-4 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Gochati. Haki zote zimehifadhiwa.
        </p>
      </footer>
      <SupportButton floating />
    </>
  ),
});
