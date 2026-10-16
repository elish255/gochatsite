import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { platform } from "@/integrations/netlify/client";
import { Button } from "@/components/ui/button";
import { ActivationRequiredDialog } from "@/components/gochati/ActivationRequiredDialog";
export const Route = createFileRoute("/withdrawal")({ component: WithdrawalPage });
function WithdrawalPage() {
  const [balance, setBalance] = useState(0),
    [amount, setAmount] = useState("25000"),
    [phone, setPhone] = useState(""),
    [history, setHistory] = useState<any[]>([]),
    [notice, setNotice] = useState(""),
    [active, setActive] = useState(false),
    [activationOpen, setActivationOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false);
  const nav = useNavigate();
  async function load() {
    const {
      data: { user },
    } = await platform.auth.getUser();
    if (!user) {
      await nav({ to: "/login", replace: true });
      return;
    }
    const [profile, withdrawals] = await Promise.all([
      platform.from("gochati_users").select("*").eq("id", user.id).single(),
      platform
        .from("gochati_withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    if (profile.error || withdrawals.error) {
      setNotice(
        profile.error?.message || withdrawals.error?.message || "Imeshindikana kupakia taarifa.",
      );
      return;
    }
    setBalance(Number(profile.data?.balance || 0));
    setPhone((current) => current || profile.data?.phone || "");
    const accountActive = profile.data?.account_status === "active" && !!profile.data?.activation_paid;
    setActive(accountActive);
    setActivationOpen(!accountActive);
    setHistory(withdrawals.data || []);
    setReady(true);
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  async function request() {
    if (!ready || busy) return;
    if (!active) { setActivationOpen(true); return; }
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value <= 20000) { setNotice("Kiasi lazima kiwe zaidi ya TZS 20,000."); return; }
    if (value > balance) { setNotice("Kiasi kinazidi salio lako."); return; }
    if (!/^[+\d ]{9,16}$/.test(phone.trim())) { setNotice("Weka namba sahihi ya simu."); return; }
    setBusy(true);
    setNotice("");
    const { error } = await platform.rpc("gochati_request_withdrawal", {
      p_amount: Number(amount),
      p_phone: phone.trim(),
    });
    if (error) setNotice(error.message);
    else {
      setNotice("Ombi limehifadhiwa kama Pending hadi admin aliweke Paid. Hakuna pesa halisi inayotumwa.");
      await load();
    }
    setBusy(false);
  }
  return (
    <main className="auth-page">
      <section className="auth-content">
        <h1>Withdrawal</h1>
        <p className="auth-subtitle">
          Balance haiwezi kutolewa kama pesa halisi. Hakuna ada ya Premium au VIP
          inayohitajika kutuma ombi hili.
        </p>
        <p>
          Salio: <strong>TZS {balance.toLocaleString()}</strong>
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Kiasi lazima kiwe zaidi ya TZS 20,000 na kisizidi salio lako.</p>
        <label className="auth-field">
          <span>Kiasi (TZS)</span>
          <div className="auth-input">
            <input
              type="number"
              min="20001"
              max={balance}
              step="1"
              aria-label="Kiasi (TZS)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </label>
        <label className="auth-field">
          <span>Namba ya simu</span>
          <div className="auth-input">
            <input aria-label="Namba ya simu" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </label>
        <Button className="auth-submit" disabled={busy || !ready} onClick={() => void request()}>
          {busy ? "Inahifadhi..." : "Hifadhi ombi"}
        </Button>
        {notice && (
          <p role="status" className="auth-message">
            {notice}
          </p>
        )}
        <h2 className="mt-6 text-lg font-bold">Historia</h2>
        {history.length === 0 ? (
          <p>Hakuna ombi bado.</p>
        ) : (
          history.map((item) => (
            <article className="card-soft mt-3 p-3" key={item.id}>
              <strong>TZS {Number(item.amount).toLocaleString()}</strong>
              <p className={item.status === "paid" ? "text-success font-bold" : "text-amber-600 font-semibold"}>{item.status === "paid" ? "Paid" : item.status === "pending" ? "Pending" : "Rejected"}</p>
              <p>{new Date(item.created_at).toLocaleString()}</p>
            </article>
          ))
        )}
        <Button
          variant="outline"
          className="mt-5 w-full"
          onClick={() => nav({ to: "/", replace: true })}
        >
          Rudi nyumbani
        </Button>
      </section>
      <ActivationRequiredDialog open={activationOpen} onClose={() => setActivationOpen(false)} />
    </main>
  );
}
