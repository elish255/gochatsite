import { MessageCircle, ShieldCheck, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AboutGochati({ page = false }: { page?: boolean }) {
  const Heading = page ? "h1" : "h2";
  return (
    <section aria-labelledby="about-gochati" className="overflow-hidden rounded-3xl border border-border bg-card text-card-foreground">
      <div className="grid md:grid-cols-[1.4fr_1fr]">
        <div className="p-6 sm:p-9">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary">About us</p>
          <Heading id="about-gochati" className="text-3xl font-bold tracking-tight sm:text-4xl">Kuhusu <span className="text-primary">Gochati</span></Heading>
          <p className="mt-5 leading-relaxed text-muted-foreground">Gochati ni jukwaa la mazungumzo ya mtandaoni linalowaunganisha wazungumzaji wa Kiswahili na watu kutoka sehemu mbalimbali duniani. Ni sehemu ya kushiriki lugha yetu, kufahamiana na kujifunza tamaduni kupitia mazungumzo.</p>
          <div className="mt-7 divide-y divide-border border-y border-border">
            <details className="group py-4" open={page}>
              <summary className="flex cursor-pointer items-center gap-3 rounded-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><MessageCircle className="size-5 text-primary" aria-hidden="true" />Dhamira yetu<span aria-hidden="true" className="ml-auto group-open:rotate-45">+</span></summary>
              <p className="mt-3 pl-8 text-sm leading-relaxed text-muted-foreground">Kuleta watu karibu kupitia Kiswahili. Tunahimiza kubadilishana maarifa, kufurahia mazungumzo na kujenga uelewano kati ya watu wa tamaduni tofauti.</p>
            </details>
            <details className="group py-4">
              <summary className="flex cursor-pointer items-center gap-3 rounded-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ShieldCheck className="size-5 text-primary" aria-hidden="true" />Usalama na faragha<span aria-hidden="true" className="ml-auto group-open:rotate-45">+</span></summary>
              <p className="mt-3 pl-8 text-sm leading-relaxed text-muted-foreground">Linda taarifa zako binafsi na nenosiri lako. Usishiriki PIN, misimbo ya uthibitisho au taarifa za siri kwenye mazungumzo. Heshimu wengine na wasiliana na huduma kwa wateja ukiona matumizi mabaya.</p>
            </details>
          </div>
        </div>
        <aside className="flex flex-col justify-center border-t border-border bg-secondary p-6 sm:p-9 md:border-t-0 md:border-l" aria-labelledby="about-support">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Tupo kukusaidia</p>
          <h2 id="about-support" className="mt-3 text-2xl font-bold tracking-tight">Msaada kwa wateja</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Unahitaji maelekezo kuhusu akaunti au matumizi ya Gochati? Tuma SMS kwa timu ya msaada.</p>
          <a href="sms:0743871339" className="mt-5 w-fit rounded-sm text-xl font-bold tracking-wide underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">0743 871 339</a>
          <Button asChild className="mt-6 w-fit"><a href="sms:0743871339?body=Nielekeze%20kuhusu%20Gochati">Tuma SMS <ArrowUpRight aria-hidden="true" /></a></Button>
        </aside>
      </div>
    </section>
  );
}
