import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Download, MessageCircle, Volume2, VolumeX, Wallet, X } from "lucide-react";
import support from "@/assets/support.jpg";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { playSound } from "@/lib/gochat-sound";

const registrationUrl = "https://moxeraagencies.com/register?ref=Mtukazi";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function GochatShell({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [modal, setModal] = useState<"withdraw" | "help" | null>(null);
  const [sound, setSound] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user?.email ?? null));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  function notify(message: string) {
    toast(message);
    if (sound) playSound();
  }

  async function installApp() {
    if (!installPrompt) {
      notify("Kama kifungo cha kusakinisha hakijaonekana, fungua menyu ya browser kisha chagua 'Install app' au 'Add to Home screen'.");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") notify("Gochati imeongezwa kwenye kifaa chako.");
    setInstallPrompt(null);
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) notify(error.message);
    else { notify("Umetoka kwenye akaunti."); void navigate({ to: "/" }); }
  }

  return <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-17 max-w-6xl items-center justify-between gap-2 px-4 md:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="Gochati.site nyumbani">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"><MessageCircle size={20} strokeWidth={2.5}/></span>
          <span className="font-display text-xl font-extrabold">Gochati<span className="text-primary">.site</span></span>
        </Link>
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <Button variant="outline" size="sm" onClick={installApp} title="Install App"><Download className="size-4" /> <span>Install App</span></Button>
          <Button variant="ghost" size="icon" title="Arifa" aria-label="Arifa" onClick={() => notify(email ? "Hakuna arifa mpya kwa sasa." : "Jisajili ili kupokea arifa zako.")}><Bell /></Button>
          <Button variant="ghost" size="icon" title={sound ? "Zima sauti" : "Washa sauti"} aria-label={sound ? "Zima sauti" : "Washa sauti"} onClick={() => { setSound(!sound); toast(sound ? "Sauti imezimwa." : "Sauti imewashwa."); if (!sound) playSound(); }}>{sound ? <Volume2 /> : <VolumeX />}</Button>
          <Button variant="outline" size="sm" onClick={() => setModal("withdraw")}><Wallet className="hidden sm:block" /> Toa pesa</Button>
          {email ? <Button size="sm" onClick={signOut}>Toka</Button> : <Button size="sm" asChild><a href={registrationUrl}>Jisajili</a></Button>}
        </nav>
      </div>
    </header>
    {children}
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-center gap-1.5"><span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-foreground shadow-sm">Msaada</span><a href="sms:0743871339?body=Nielekeze%20kuhusu%20Gochati" aria-label="Msaada — Tuma SMS" title="Msaada — Tuma SMS" className="gochat-float block overflow-hidden rounded-full border-2 border-primary shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><img src={support} alt="Msaidizi wa Gochati" width={56} height={56} className="size-14 object-cover" /></a></div>
    <footer className="mt-16 border-t border-border bg-secondary/50">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 md:grid-cols-[1fr_auto] md:px-6">
        <div><div className="font-display text-2xl font-extrabold">go<span className="text-primary">chati</span><span className="text-accent">.site</span></div><p className="mt-2 max-w-md text-sm text-muted-foreground">Gumza na watu duniani, jifunze lugha na tamaduni, na gundua fursa za mtandaoni.</p></div>
        <div className="flex flex-wrap items-start gap-2"><Button variant="outline" asChild><a href="https://chat.whatsapp.com/HJR16xnRf53J54yvIrIJwA?s=cl&p=a&mlu=4&ilr=4" target="_blank" rel="noopener noreferrer">Jiunge na Channel</a></Button><Button variant="secondary" onClick={() => setModal("help")}>Msaada</Button></div>
      </div>
      <div className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">© 2026 Gochati.site. Haki zote zimehifadhiwa.</div>
    </footer>
    <Toaster position="top-center" richColors />
    {modal && <div className="fixed inset-0 z-50 grid place-items-center bg-overlay p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
      <div role="dialog" aria-modal="true" aria-label={modal === "withdraw" ? "Toa pesa" : "Msaada"} className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-primary">GOCHATI.SITE</p><h2 className="mt-1 font-display text-2xl font-bold">{modal === "withdraw" ? "Toa pesa" : "Tunahapa kukusaidia"}</h2></div><Button variant="ghost" size="icon" aria-label="Funga" onClick={() => setModal(null)}><X/></Button></div>
        {modal === "withdraw" ? <><div className="rounded-md bg-secondary p-4"><p className="text-xs text-muted-foreground">Salio linalopatikana</p><p className="font-display text-3xl font-bold">TZS 0</p></div><p className="mt-4 text-sm leading-relaxed text-muted-foreground">Njia za kutoa pesa zinaonyeshwa kwenye ukurasa wa mwanzo. Jisajili kupitia mfumo wa usajili ili kuendelea.</p><Button className="mt-5 w-full" asChild><a href={registrationUrl}>Jisajili</a></Button></> : <><p className="text-sm text-muted-foreground">Kwa msaada kuhusu akaunti, mazungumzo au malipo, tuma SMS kwenda namba 0743871339.</p><Button className="mt-5" asChild><a href="sms:0743871339?body=Nielekeze%20kuhusu%20Gochati">Tuma SMS</a></Button></>}
      </div>
    </div>}
  </div>;
}
