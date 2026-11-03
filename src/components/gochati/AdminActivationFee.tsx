import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function AdminActivationFee() {
  const [amount, setAmount] = useState("");
  const [current, setCurrent] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/gochati-settings", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (active) { setCurrent(data.activation_fee); setAmount(String(data.activation_fee)); }
    }).catch(() => { if (active) setNotice("Ada haipatikani. Fungua sehemu hii tena kujaribu upya."); });
    return () => { active = false; };
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    const fee = Number(amount);
    if (!Number.isSafeInteger(fee) || fee < 1 || fee > 10000000) {
      setNotice("Weka kiasi kamili kati ya TZS 1 na 10,000,000."); return;
    }
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/gochati-settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activation_fee: fee }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Imeshindikana kuhifadhi ada.");
      setCurrent(data.activation_fee);
      setNotice("Ada imehifadhiwa. Kiasi kipya kinaonekana kwa watumiaji moja kwa moja.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Jaribu tena."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-border bg-card p-6 max-w-xl">
    <h2 className="text-xl font-bold">Activation fee</h2>
    <p className="mt-2 text-muted-foreground">Badilisha ada ya kuwasha akaunti bila kugusa code. Maombi mapya yanatumia ada hii; yaliyoanzishwa tayari yanabaki na kiasi chake.</p>
    <p className="my-5 font-semibold">Ada ya sasa: {current === null ? "Inapakia…" : `TZS ${current.toLocaleString("en-US")}`}</p>
    <form onSubmit={save} className="space-y-4">
      <label className="block font-medium" htmlFor="activation-fee">Kiasi kipya (TZS)</label>
      <input id="activation-fee" type="number" min="1" max="10000000" step="1" required value={amount} onChange={event => setAmount(event.target.value)} disabled={busy || current === null} className="w-full rounded-xl border border-input bg-background px-4 py-3" />
      <Button type="submit" disabled={busy || current === null}>{busy ? "Inahifadhi…" : "Hifadhi ada"}</Button>
      {notice && <p role="status" className="text-sm">{notice}</p>}
    </form>
  </section>;
}
