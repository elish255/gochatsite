import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { platform } from "@/integrations/supabase/platform";
import { Button } from "@/components/ui/button";

type Purpose = "premium" | "vip" | "tax";

const LABELS: Record<Purpose, string> = {
  premium: "Ada ya Premium",
  vip: "Ada ya VIP",
  tax: "Ada ya Tax",
};

const OTHER_PURPOSES: Purpose[] = ["premium", "tax"];

function formatTzs(amount: number) {
  return `TZS ${amount.toLocaleString("en-US")}`;
}

export function AdminPaymentPrices({ vipOnly = false }: { vipOnly?: boolean }) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    void platform
      .from("gochati_payment_prices")
      .select("purpose,amount")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setMessage({ text: "Imeshindwa kupakia bei: " + error.message, ok: false });
          return;
        }
        const next: Record<string, number> = {};
        for (const row of data || []) next[row.purpose] = Number(row.amount);
        setPrices(next);
        setDrafts(Object.fromEntries(Object.entries(next).map(([k, v]) => [k, String(v)])));
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(purpose: Purpose) {
    const amount = Number(drafts[purpose]);
    if (!Number.isInteger(amount) || amount < 100 || amount > 10_000_000) {
      setMessage({ text: "Weka kiasi sahihi (TZS 100 hadi 10,000,000).", ok: false });
      return;
    }
    setBusy(purpose);
    setMessage(null);
    const { data, error } = await platform
      .from("gochati_payment_prices")
      .update({ amount, updated_at: new Date().toISOString() })
      .eq("purpose", purpose)
      .select("amount")
      .maybeSingle();
    setBusy("");
    if (error || !data) {
      setMessage({ text: "Imeshindwa kuhifadhi: " + (error?.message || "hakuna ruhusa"), ok: false });
      return;
    }
    const saved = Number(data.amount);
    setPrices((prev) => ({ ...prev, [purpose]: saved }));
    setDrafts((prev) => ({ ...prev, [purpose]: String(saved) }));
    setMessage({ text: `${LABELS[purpose]} sasa ni ${formatTzs(saved)} kwa watumiaji wote.`, ok: true });
  }

  const vipCurrent = prices.vip ?? 0;
  const vipDraft = drafts.vip ?? "";
  const vipChanged = vipDraft !== "" && Number(vipDraft) !== vipCurrent;

  return (
    <section className="card-soft mt-4 flex flex-col gap-4 p-4" aria-labelledby="vip-price-title">
      <form
        className="flex flex-col gap-3 rounded-xl border-2 border-primary/60 bg-primary/10 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save("vip");
        }}
      >
        <div className="flex items-center gap-2">
          <Crown className="size-6 text-primary" aria-hidden="true" />
          <h2 id="vip-price-title" className="text-xl font-bold">
            VIP Amount kwa Wote
          </h2>
        </div>
        <p className="text-sm leading-relaxed">
          Weka kiasi kipya cha VIP kisha bonyeza <strong>Save changes</strong>. Kiasi kitabadilika kwa watumiaji wote kwenye ukurasa wa malipo na SplashPay papo hapo.
        </p>
        <p className="text-sm">
          Kiasi cha sasa: <strong className="text-lg">{formatTzs(vipCurrent)}</strong>
        </p>
        <label htmlFor="price-vip" className="text-sm font-semibold">
          VIP amount mpya (TZS)
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="price-vip"
            type="number"
            min="100"
            max="10000000"
            step="1"
            inputMode="numeric"
            value={vipDraft}
            onChange={(e) => setDrafts((prev) => ({ ...prev, vip: e.target.value }))}
            className="flex-1 rounded-lg border border-border bg-background p-3 text-lg font-semibold text-foreground"
          />
          <Button type="submit" size="lg" className="font-bold" disabled={busy === "vip" || !vipChanged}>
            {busy === "vip" ? "Inahifadhi..." : "Save changes"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Watumiaji waliowekewa kiasi chao binafsi wataendelea kulipa kiasi hicho binafsi.
        </p>
      </form>

      {!vipOnly && (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-bold">Bei nyingine za malipo</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {OTHER_PURPOSES.map((purpose) => (
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
                <p className="text-xs text-muted-foreground">Sasa: {formatTzs(prices[purpose] ?? 0)}</p>
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
                  {busy === purpose ? "Inahifadhi..." : "Save changes"}
                </Button>
              </form>
            ))}
          </div>
        </div>
      )}

      {message && (
        <p role="status" className={message.ok ? "text-sm font-semibold text-primary" : "text-sm font-semibold text-destructive"}>
          {message.text}
        </p>
      )}
    </section>
  );
}
