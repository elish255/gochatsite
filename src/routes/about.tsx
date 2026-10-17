import { createFileRoute, Link } from "@tanstack/react-router";
import { AboutGochati } from "@/components/gochati/AboutGochati";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://gochati.online/about" }],
    meta: [
      { title: "Kuhusu Gochati — Mazungumzo na Kiswahili" },
      {
        name: "description",
        content:
          "Fahamu Gochati, dhamira yetu ya kuunganisha watu kupitia Kiswahili na namna ya kupata msaada.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:py-14">
      <div className="mx-auto max-w-5xl">
        <nav
          aria-label="Urambazaji"
          className="mb-6 flex flex-wrap items-center justify-between gap-3"
        >
          <Button variant="outline" asChild>
            <Link to="/">Rudi mwanzo</Link>
          </Button>
          <Link to="/terms" className="text-sm text-muted-foreground underline underline-offset-4">
            Masharti ya matumizi
          </Link>
        </nav>
        <AboutGochati page />
        <p className="mt-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Gochati. Haki zote zimehifadhiwa.
        </p>
      </div>
    </main>
  );
}
