import { useEffect, useState } from "react";
import { platform } from "@/integrations/supabase/platform";
import { Button } from "@/components/ui/button";

type Purpose = "premium" | "vip" | "tax";

const LABELS: Record<Purpose, string> = {
  premium: "Ada ya Premium",
  vip: "Ada ya VIP",
  tax: "Ada ya Tax",
};

const PURPOSES: Purpose[] = ["premium", "vip", "tax"];

export function AdminPaymentPrices() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void platform
      .from("gochati_payment_prices")
      .select("purpose,amount")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setMessage("Imeshindwa kupakia bei: " + error.message);
          return;
        }
        const next: Record<string, number> = {};
        for (const row of data || []) next[row.purpose] = Number(row.amount);
        setPrices(next);
        setDrafts(
          Object.fromEntries(
            Object.entries(next).map(([k, v]) => [k, String(v)]),
          ),
        );
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(purpose: Purpose) {
    const amount = Number(drafts[purpose]);
    if (!Number.isInteger(amount) || amount < 100 || amount > 10_000_000) {
      setMessage("Weka kiasi sahihi (TZS 100 hadi 10,000,000).");
      return;
    }
    setBusy(purpose);
    setMessage("");
    const { data, error } = await platform
      .from("gochati_payment_prices")
      .update({ amount, updated_at: new Date().toISOString() })
      .eq("purpose", purpose)
      .select("amount")
      .maybeSingle();
    setBusy("");
    if (error || !data) {
      setMessage("Imeshindwa kuhifadhi: " + (error?.message || "hakuna ruhusa"));
      return;
    }
    setPrices((prev) => ({ ...prev, [purpose]: Number(data.amount) }));
    setMessage(
      `${LABELS[purpose]} sasa ni TZS ${Number(data.amount).toLocaleString("en-US")} kwa watumiaji wote.`,
    );
  }

  return (
    <section className="card-soft mt-4 flex flex-col gap-3 p-4" aria-labelledby="price-settings-title">
      <div>
        <h2 id="price-settings-title" className="text-xl font-bold">
          Bei za malipo
        </h2>
        <p className="text-sm leading-relaxed">
          Badilisha kiasi kinacholipwa na watumiaji wote. Bei mpya inaonekana kwenye ukurasa wa malipo na inatumika SplashPay mara moja.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {PURPOSES.map((purpose) => (
          <form
            key={purpose}
            className="flex flex-col gap-2 rounded-lg border border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void save(purpose);
            }}
          >
            <label htmlFor={`price-${purpose}`} className="text-sm font-semibold">
              {LABELS[purpose]}
            </label>
            <p className="text-xs text-muted-foreground">
              Sasa: TZS {(prices[purpose] ?? 0).toLocaleString("en-US")}
            </p>
            <input
              id={`price-${purpose}`}
              type="number"
              min="100"
              step="1"
              inputMode="numeric"
              value={drafts[purpose] ?? ""}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [purpose]: e.target.value }))}
              className="rounded-lg border border-border bg-background p-2 text-foreground"
            />
            <Button type="submit" disabled={busy === purpose}>
              {busy === purpose ? "Inahifadhi..." : "Hifadhi"}
            </Button>
          </form>
        ))}
      </div>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
