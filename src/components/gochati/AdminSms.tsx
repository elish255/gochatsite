import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

type SmsResult = {
  total: number;
  queued: number;
  failed: number;
  results: { username: string; status: string }[];
};

export function AdminSms() {
  const [audience, setAudience] = useState("all");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SmsResult | null>(null);

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
          <option value="all">Watumiaji wote</option>
          <option value="premium">Premium users tu</option>
          <option value="normal">Normal users tu</option>
          <option value="active">Active users tu</option>
          <option value="inactive">Inactive users tu</option>
          <option value="vip">VIP users tu</option>
        </select>
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
        <Button type="submit" disabled={sending || !message.trim()}>
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
