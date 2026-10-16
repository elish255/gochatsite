import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { platform } from "@/integrations/netlify/client";
import { Button } from "@/components/ui/button";
import { ActivationRequiredDialog } from "@/components/gochati/ActivationRequiredDialog";
export const Route = createFileRoute("/withdrawal")({ component: WithdrawalPage });
function WithdrawalPage() {
  const [balance, setBalance] = useState(0),
    [amount, setAmount] = useState("100000"),
    [phone, setPhone] = useState(""),
    [history, setHistory] = useState<any[]>([]),
    [notice, setNotice] = useState(""),
    [active, setActive] = useState(false),
    [activationOpen, setActivationOpen] = useState(false),
    [busy, setBusy] = useState(false);
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
    setPhone(profile.data?.phone || "");
    const accountActive = profile.data?.account_status === "active" && !!profile.data?.activation_paid;
    setActive(accountActive);
    setActivationOpen(!accountActive);
    setHistory(withdrawals.data || []);
  }
  useEffect(() => {
    void load();
  }, []);
  async function request() {
    if (!active) { setActivationOpen(true); return; }
    setBusy(true);
    setNotice("");
    const { error } = await platform.rpc("gochati_request_withdrawal", {
      p_amount: Number(amount),
      p_phone: phone,
    });
    if (error) setNotice(error.message);
    else {
      setNotice("Ombi limehifadhiwa. Hakuna pesa halisi inayotumwa.");
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
        <label className="auth-field">
          <span>Kiasi (TZS)</span>
          <div className="auth-input">
            <input
              type="number"
              min="100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </label>
        <label className="auth-field">
          <span>Namba ya simu</span>
          <div className="auth-input">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </label>
        <Button className="auth-submit" disabled={busy} onClick={() => void request()}>
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
              <p>{item.status === "paid" ? "Limekamilishwa; hakuna pesa iliyotumwa" : item.status}</p>
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
