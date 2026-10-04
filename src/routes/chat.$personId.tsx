import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Send, ShieldCheck, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GochatShell } from "@/components/gochat-shell";
import { money, people } from "@/lib/gochat-data";
import { playSound } from "@/lib/gochat-sound";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/chat/$personId")({
  head: ({ params }) => ({ meta: [
    { title: `Chat na ${params.personId} — Gochat` },
    { name: "description", content: `Anza mazungumzo na ${params.personId} kupitia Gochat. Badilishana lugha na utamaduni.` },
    { property: "og:title", content: `Chat na ${params.personId} — Gochat` },
    { property: "og:description", content: `Gumza na ${params.personId} kupitia Gochat kuhusu lugha na utamaduni.` },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ChatPage,
});

type Message = { id: string; sender: "user" | "demo"; body: string; created_at: string };

function ChatPage() {
  const { personId } = Route.useParams();
  const person = people.find((item) => item.id === personId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      setUserId(data.user?.id ?? null);
      if (data.user) {
        const { data: history } = await supabase.from("chat_messages").select("id, sender, body, created_at").eq("partner_id", personId).order("created_at", { ascending: true });
        if (active && history) setMessages(history as Message[]);
      }
    });
    return () => { active = false; };
  }, [personId]);

  if (!person) return <GochatShell><div className="mx-auto max-w-3xl px-4 py-24 text-center"><h1 className="font-display text-3xl font-bold">Mtu huyu hajapatikana.</h1><Button className="mt-6" asChild><Link to="/">Rudi nyumbani</Link></Button></div></GochatShell>;

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = text.trim();
    if (!body) { toast.error("Andika ujumbe kwanza."); return; }
    if (body.length > 2000) { toast.error("Ujumbe ni mrefu mno."); return; }
    setSending(true);
    if (userId) {
      const { data, error } = await supabase.from("chat_messages").insert({ user_id: userId, partner_id: personId, sender: "user", body }).select("id, sender, body, created_at").single();
      if (error) { setSending(false); toast.error("Ujumbe haukutumwa. Jaribu tena."); return; }
      if (data) setMessages((previous) => [...previous, data as Message]);
    } else setMessages((previous) => [...previous, { id: `${Date.now()}`, sender: "user", body, created_at: new Date().toISOString() }]);
    setText(""); setSending(false); playSound("send");
    toast.success(userId ? "Ujumbe umehifadhiwa." : "Ujumbe umeonyeshwa hapa. Jisajili ili kuhifadhi mazungumzo.");
  }

  return <GochatShell><main className="mx-auto max-w-4xl px-4 py-7 md:px-6"><Button variant="ghost" size="sm" asChild><Link to="/"><ArrowLeft/> Rudi kwa watu wote</Link></Button>
    <div className="mt-5 overflow-hidden rounded-md border border-border bg-card shadow-sm">
      <div className="flex items-center gap-4 border-b border-border bg-secondary/45 p-5"><img src={person.image} alt={person.name} width={72} height={72} className="size-16 rounded-md object-cover"/><div className="min-w-0 flex-1"><h1 className="font-display text-2xl font-bold">Chat na {person.name}</h1><p className="text-xs font-semibold text-primary">● Online sasa</p><p className="mt-1 truncate text-sm text-muted-foreground">{person.topic}</p></div><Button variant="ghost" size="icon" title="Jaribu sauti" aria-label="Jaribu sauti" onClick={() => { playSound(); toast("Sauti imechezwa."); }}><Volume2/></Button></div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border px-5 py-3 text-xs text-muted-foreground"><span><strong className="text-foreground">{money(person.amount)}</strong> · kiasi cha mfano</span><span>{person.minutes} dakika · muda wa mfano</span></div>
       <div className="min-h-[350px] space-y-4 bg-background/60 p-5 md:min-h-[420px]"><div className="flex gap-3"><img src={person.image} alt="" className="size-8 rounded-md object-cover"/><div className="max-w-[80%] rounded-md border border-border bg-card px-4 py-3 text-sm shadow-sm"><p>{person.prompt}</p></div></div>{messages.map((message) => <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-md px-4 py-3 text-sm ${message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"}`}>{message.body}</div></div>)}</div>
      <form onSubmit={send} className="flex gap-2 border-t border-border p-4"><label className="sr-only" htmlFor="message">Andika ujumbe wako</label><input id="message" value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder="Andika ujumbe wako..." className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"/><Button type="submit" disabled={sending} className="h-11">Tuma <Send/></Button></form>
    </div><p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck size={16} className="shrink-0 text-primary"/> Huu ni mfano wa mazungumzo, si mazungumzo ya moja kwa moja na mtu halisi. Hakuna mapato yanayoingia kwa kutuma ujumbe hapa.</p>
  </main></GochatShell>;
}