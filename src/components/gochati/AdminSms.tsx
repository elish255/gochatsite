import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

type SmsResult = {
  total: number;
  queued: number;
  failed: number;
  results: { username: string; status: string }[];
};

const audienceOptions = [
  ["all", "Watumiaji wote"],
  ["premium", "Premium users tu"],
  ["normal", "Normal users tu"],
  ["active", "Active users tu"],
  ["inactive", "Inactive users tu"],
  ["vip", "VIP users tu"],
] as const;

export function AdminSms() {
  const [audience, setAudience] = useState("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SmsResult | null>(null);

  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [countError, setCountError] = useState("");
  const [countAttempt, setCountAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCountError("");
    fetch("/api/gochati-sms", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "counts" }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error("Idadi ya wapokeaji haijapatikana.");
        if (!controller.signal.aborted) setCounts(data.counts);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCountError("Idadi ya wapokeaji haijapatikana.");
      });
    return () => controller.abort();
  }, [countAttempt]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (sending || !message.trim()) return;
    setSending(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/gochati-sms", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", audience, message: message.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "SMS hazijatumwa. Jaribu tena.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "SMS hazijatumwa. Jaribu tena.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card-soft mt-4 p-4" aria-labelledby="admin-sms-title">
      <h2 id="admin-sms-title" className="text-xl font-bold">
        Tuma SMS kwa watumiaji
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        SMS zinatumwa kwenye namba walizosajili. Tumia [Username] kuweka username ya kila mpokeaji.
        Kundi lisizidi watumiaji 500 kwa utumaji mmoja.
      </p>
      <form onSubmit={send} className="mt-4 space-y-3" aria-busy={sending}>
        <label className="block text-sm font-semibold" htmlFor="sms-audience">
          Wapokeaji wa SMS
        </label>
        <select
          id="sms-audience"
          className="w-full rounded-xl border border-border bg-background p-3 text-foreground"
          value={audience}
          onChange={(event) => setAudience(event.target.value)}
          disabled={sending}
        >
          {audienceOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}{counts ? ` (${counts[value]})` : ""}
            </option>
          ))}
        </select>
        <div aria-live="polite" className="text-sm text-muted-foreground">
          {countError ? (
            <>
              {countError}{" "}
              <Button type="button" variant="outline" size="sm" onClick={() => setCountAttempt((value) => value + 1)}>
                Jaribu tena
              </Button>
            </>
          ) : counts ? (
            <>
              Wapokeaji wa kundi hili: <strong className="text-foreground">{counts[audience]}</strong>.
              {counts[audience] === 0 && " Hakuna watumiaji kwenye kundi hili."}
              {counts[audience] > 500 && " Kundi lina zaidi ya watumiaji 500. Chagua kundi dogo kabla ya kutuma."}
            </>
          ) : "Inapakia idadi ya wapokeaji..."}
        </div>
        <label className="block text-sm font-semibold" htmlFor="sms-message">
          Ujumbe wa SMS
        </label>
        <textarea
          id="sms-message"
          className="min-h-32 w-full rounded-xl border border-border bg-background p-3 text-foreground"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={1200}
          required
          disabled={sending}
          placeholder="Hongera! [Username]..."
        />
        <p className="text-sm text-muted-foreground">Herufi {message.length}/1200</p>
        <Button type="submit" disabled={sending || !message.trim() || (counts != null && (counts[audience] === 0 || counts[audience] > 500))}>
          {sending ? "Inatuma SMS..." : "Tuma SMS"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="auth-error mt-3">
          {error}
        </p>
      )}
      {result && (
        <div role="status" className="mt-4 space-y-2">
          <p>
            Wapokeaji: {result.total}. Zilizokubaliwa kutumwa: {result.queued}. Zilizoshindikana:{" "}
            {result.failed}.
          </p>
          {result.failed > 0 && (
            <p className="text-sm">Kagua namba za simu na huduma ya SMS kabla ya kutuma tena.</p>
          )}
          {result.results
            .filter((row) => row.status === "failed")
            .map((row) => (
              <p key={row.username} className="text-sm">
                @{row.username}: SMS imeshindikana.
              </p>
            ))}
        </div>
      )}
    </section>
  );
}
