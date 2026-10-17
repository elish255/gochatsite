import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://gochati.online/terms" }],
    meta: [
      { title: "Masharti ya Matumizi — Gochati" },
      {
        name: "description",
        content:
          "Soma masharti ya matumizi ya Gochati kuhusu akaunti, usalama, faragha na matumizi ya huduma za mazungumzo.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large" },
    ],
  }),
  component: TermsPage,
});
function TermsPage() {
  return (
    <main className="auth-page">
      <article
        className="auth-content leading-relaxed"
        style={{ maxWidth: 760, textAlign: "left" }}
      >
        <h1>Terms of Service — Gochati</h1>
        <p className="auth-subtitle">Masharti ya matumizi ya huduma za Gochati</p>
        <p>
          Kwa kuunda akaunti au kutumia Gochati, unakubali masharti haya. Tafadhali yasome kabla ya
          kuendelea.
        </p>
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">1. Huduma ya Gochati</h2>
          <p>
            Gochati ni jukwaa la mawasiliano ya mtandaoni linalowaunganisha watumiaji kwa
            mazungumzo. Watumiaji wanawajibika kutumia huduma kwa heshima na kwa mujibu wa sheria
            zinazotumika.
          </p>
        </section>
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">2. Akaunti na taarifa</h2>
          <p>
            Toa taarifa sahihi wakati wa usajili, linda nenosiri lako na usimruhusu mtu mwingine
            kutumia akaunti yako. Una jukumu la shughuli zinazofanyika kupitia akaunti yako.
          </p>
        </section>
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">3. Umri na usalama</h2>
          <p>
            Ni lazima uwe na umri unaoruhusiwa kisheria kutumia huduma hizi. Hairuhusiwi kutumia
            Gochati kwa udanganyifu, vitisho, unyanyasaji, ulaghai, maudhui haramu au kuomba taarifa
            binafsi za wengine kwa njia isiyo salama.
          </p>
        </section>
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">4. Malipo, salio na ada</h2>
          <p>
            Huduma fulani zinaweza kuhitaji ada ya uanzishaji au malipo ya kuboresha akaunti. Kiasi
            na masharti husika yataonyeshwa kwenye ukurasa wa malipo.
          </p>
        </section>
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">5. Matumizi yaliyokatazwa</h2>
          <p>
            Usitumie huduma kuwasilisha taarifa za uongo, kuingilia mifumo, kujaribu kupata akaunti
            za watu wengine, kutuma barua taka au kuendesha shughuli zisizo halali. Gochati inaweza
            kuzuia au kusimamisha akaunti inayokiuka masharti haya.
          </p>
        </section>
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">6. Faragha</h2>
          <p>
            Taarifa za akaunti hutumika kuendesha huduma, kuthibitisha malipo, kuzuia udanganyifu na
            kutoa msaada. Usitume taarifa za siri za malipo au nywila kwa watu wengine.
          </p>
        </section>
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">7. Upatikanaji na mabadiliko</h2>
          <p>
            Huduma inaweza kusitishwa kwa muda kwa ajili ya matengenezo, usalama au sababu za
            kiufundi. Gochati inaweza kusasisha masharti haya; toleo jipya litawekwa kwenye ukurasa
            huu.
          </p>
        </section>
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">8. Mawasiliano</h2>
          <p>
            Kwa msaada kuhusu akaunti au huduma, tumia njia ya Customer Service inayoonyeshwa kwenye
            Gochati.
          </p>
        </section>
        <nav
          aria-label="Viungo vya ukurasa"
          className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row"
        >
          <Button asChild size="lg">
            <Link to="/register">Rudi kwenye usajili</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/">Homepage</Link>
          </Button>
        </nav>
      </article>
    </main>
  );
}
