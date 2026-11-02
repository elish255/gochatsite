import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ImagePlus, Mic, Send, Square, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { careApi } from "./customer-care-api";
type Message = {
  id: string;
  sender: "user" | "admin";
  body: string;
  kind: string;
  created_at: string;
  read_at: string | null;
};
export function CustomerCareChat({ userId, admin = false }: { userId?: string; admin?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [older, setOlder] = useState<Message[]>([]);
  const [hasOlder, setHasOlder] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [voice, setVoice] = useState<File | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const end = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    try {
      const result = await careApi({ action: "messages", user_id: userId });
      if (alive.current) {
        setMessages(result.data);
        window.dispatchEvent(new Event("care-messages-read"));
        setHasOlder(result.data.length === 50);
      }
    } catch (err) {
      if (alive.current) setError(err instanceof Error ? err.message : "Imeshindwa kupakia.");
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    alive.current = true;
    void load();
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const interval = setInterval(() => void load(), 5000);
    return () => {
      alive.current = false;
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [load]);
  const latestMessageId = messages.at(-1)?.id;
  useEffect(() => {
    end.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [latestMessageId]);
  async function upload(file: File) {
    if (file.size > 4_000_000) {
      setError("Faili lisizidi MB 4.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      if (userId) form.append("user_id", userId);
      const response = await fetch("/api/gochati-support", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Faili halijatumwa.");
      setVoice(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Faili halijatumwa.");
    } finally {
      setBusy(false);
    }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (busy || !text.trim()) return;
    setBusy(true);
    setError("");
    try {
      await careApi({ action: "send", user_id: userId, message: text.trim() });
      setText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ujumbe haujatumwa.");
    } finally {
      setBusy(false);
    }
  }
  async function record() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
        throw new Error("Simu hii haiungi mkono kurekodi. Chagua faili la sauti.");
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        stream.current.getTracks().forEach((t) => t.stop());
        return;
      }
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      if (!mime) throw new Error("Tumia kitufe cha kuchagua faili la sauti kwenye simu hii.");
      const r = new MediaRecorder(stream.current, { mimeType: mime });
      recorder.current = r;
      const chunks: Blob[] = [];
      let size = 0;
      r.ondataavailable = (e) => {
        if (e.data.size) {
          chunks.push(e.data);
          size += e.data.size;
          if (size > 3_800_000 && r.state === "recording") r.stop();
        }
      };
      r.onstop = () => {
        if (timer.current) clearTimeout(timer.current);
        stream.current?.getTracks().forEach((t) => t.stop());
        if (alive.current) {
          setRecording(false);
          setVoice(
            new File(
              chunks,
              "voice." + (mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm"),
              { type: mime.split(";")[0] || "audio/webm" },
            ),
          );
        }
      };
      r.onerror = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setError("Kurekodi kumeshindikana. Jaribu tena.");
      };
      r.start(1000);
      setRecording(true);
      setVoice(null);
      timer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 60_000);
    } catch (err) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(err instanceof Error ? err.message : "Ruhusu microphone ili kurekodi voice.");
    }
  }
  async function loadOlder() {
    const first = older[0] || messages[0];
    if (!first) return;
    setBusy(true);
    setError("");
    try {
      const result = await careApi({
        action: "messages",
        user_id: userId,
        before: first.created_at,
      });
      setOlder((prev) => [...result.data, ...prev]);
      setHasOlder(result.data.length === 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imeshindwa kupakia.");
    } finally {
      setBusy(false);
    }
  }
  const all = Array.from(new Map([...older, ...messages].map((m) => [m.id, m])).values());
  return (
    <section className="flex min-h-0 flex-col gap-3" aria-label="Chat ya customer care">
      <div className="rounded-2xl bg-primary/10 p-3 text-sm">
        <MessageCircle className="mr-2 inline size-4 text-primary" />
        Mazungumzo ya moja kwa moja na huduma kwa wateja. Majibu ya admin yanaonekana hapa.
      </div>
      <div
        className="h-[min(45vh,420px)] space-y-3 overflow-y-auto rounded-2xl border border-border bg-secondary/30 p-3"
        aria-live="polite"
        aria-busy={loading}
      >
        {hasOlder && (
          <Button size="sm" variant="outline" onClick={() => void loadOlder()} disabled={busy}>
            Ujumbe wa awali
          </Button>
        )}
        {loading ? (
          <p className="animate-pulse text-sm">Inapakia mazungumzo...</p>
        ) : !all.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Karibu customer care. Tuma ujumbe, picha au voice kuanza.
          </p>
        ) : (
          all.map((m) => (
            <article
              key={m.id}
              className={`max-w-[90%] rounded-2xl p-3 ${m.sender === (admin ? "admin" : "user") ? "ml-auto bg-primary text-primary-foreground" : "border border-border bg-background"}`}
            >
              <p className="mb-1 text-xs font-bold">
                {m.sender === "admin"
                  ? "Customer services · Huduma kwa wateja"
                  : admin
                    ? "User · Mteja"
                    : "User · Wewe"}
              </p>
              {m.kind === "image" ? (
                <a href={`/api/gochati-support?file=${m.id}`} target="_blank" rel="noreferrer">
                  <img
                    src={`/api/gochati-support?file=${m.id}`}
                    alt="Picha kwenye mazungumzo"
                    className="max-h-60 rounded-xl"
                    loading="lazy"
                  />
                </a>
              ) : m.kind === "audio" ? (
                <audio
                  controls
                  preload="none"
                  src={`/api/gochati-support?file=${m.id}`}
                  className="max-w-full"
                />
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
              )}
              <p className="mt-2 text-[10px] opacity-75">
                {new Date(m.created_at).toLocaleString()}
              </p>
            </article>
          ))
        )}
        <div ref={end} />
      </div>
      {error && (
        <p role="alert" className="auth-error text-sm">
          {error}{" "}
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Jaribu tena
          </Button>
        </p>
      )}
      {voice && (
        <VoicePreview
          file={voice}
          busy={busy}
          onSend={() => void upload(voice)}
          onCancel={() => setVoice(null)}
        />
      )}
      <form onSubmit={send} className="space-y-2">
        <label className="sr-only" htmlFor="care-message">
          Ujumbe kwa customer care
        </label>
        <textarea
          id="care-message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
          rows={2}
          placeholder="Andika ujumbe..."
          className="w-full rounded-xl border border-border bg-background p-3 text-sm"
          disabled={busy}
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,audio/x-m4a"
            className="hidden"
            aria-label="Chagua picha au sauti"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInput.current?.click()}
            disabled={busy || recording}
          >
            <ImagePlus className="mr-1 size-4" />
            Picha / sauti
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void record()}
            disabled={busy}
          >
            {recording ? <Square className="mr-1 size-4" /> : <Mic className="mr-1 size-4" />}
            {recording ? "Maliza (sek. 60)" : "Voice"}
          </Button>
          <Button
            type="submit"
            size="sm"
            className="ml-auto"
            disabled={busy || recording || !text.trim()}
          >
            <Send className="mr-1 size-4" />
            {busy ? "Inatuma..." : "Tuma"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Picha au sauti hadi MB 4. Voice hadi sekunde 60.
        </p>
      </form>
    </section>
  );
}
function VoicePreview({
  file,
  busy,
  onSend,
  onCancel,
}: {
  file: File;
  busy: boolean;
  onSend: () => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <audio controls src={url} className="max-w-full" />
      <div className="flex gap-2">
        <Button size="sm" onClick={onSend} disabled={busy}>
          Tuma voice
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>
          Futa voice
        </Button>
      </div>
    </div>
  );
}
