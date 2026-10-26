import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { platform } from "@/integrations/netlify/client";
import { Button } from "@/components/ui/button";
import { ActivationRequiredDialog } from "@/components/gochati/ActivationRequiredDialog";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
export const Route = createFileRoute("/withdrawal")({ component: WithdrawalPage });
function WithdrawalPage() {
  const [balance, setBalance] = useState(0),
    [amount, setAmount] = useState("100000"),
    [phone, setPhone] = useState(""),
    [history, setHistory] = useState<any[]>([]),
    [notice, setNotice] = useState(""),
    [active, setActive] = useState(false),
    [activationOpen, setActivationOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false);
  const [eligibility, setEligibility] = useState<any>(null);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const minAmount = eligibility?.is_premium ? 500000 : 100000;
  const fee = Math.round(Math.max(0, Number(amount) || 0) * 20) / 100;
  const net = Math.max(0, Number(amount) || 0) - fee;
  const eligible =
    eligibility &&
    (eligibility.is_vip ||
      (eligibility.is_premium ? eligibility.active_referrals >= 5 : eligibility.referrals >= 10));
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
    const access = await platform.rpc("gochati_withdrawal_eligibility", {});
    if (access.error) {
      setNotice(access.error.message);
      setReady(false);
      return;
    }
    setEligibility(access.data);
    setBalance(Number(profile.data?.balance || 0));
    setPhone((current) => current || profile.data?.phone || "");
    const accountActive =
      profile.data?.account_status === "active" && !!profile.data?.activation_paid;
    setActive(accountActive);
    setActivationOpen(!accountActive);
    setHistory(withdrawals.data || []);
    setReceipt((current: any) =>
      current ? withdrawals.data?.find((item: any) => item.id === current.id) || current : null,
    );
    setReady(true);
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  async function request() {
    if (!ready || busy) return;
    if (!active) {
      setActivationOpen(true);
      return;
    }
    const value = Number(amount);
    if (!Number.isSafeInteger(value) || value < minAmount) {
      setNotice(`Minimum withdrawal ni TZS ${minAmount.toLocaleString()}.`);
      return;
    }
    if (value > balance) {
      setNotice("SALIO HALITOSHI");
      return;
    }
    if (!/^[+\d ]{9,16}$/.test(phone.trim())) {
      setNotice("Weka namba sahihi ya simu.");
      return;
    }
    if (!eligible) {
      setRequirementsOpen(true);
      return;
    }
    setBusy(true);
    setNotice("");
    const { data: withdrawalId, error } = await platform.rpc("gochati_request_withdrawal", {
      p_amount: Number(amount),
      p_phone: phone.trim(),
    });
    if (error) setNotice(error.message);
    else {
      setReceipt({
        id: withdrawalId,
        phone: phone.trim(),
        amount: value,
        fee,
        net_amount: value - fee,
        status: "pending",
      });
      await load();
    }
    setBusy(false);
  }
  return (
    <main className="auth-page">
      <section className="auth-content">
        <h1>Withdrawal</h1>
        <p>
          Salio: <strong>TZS {balance.toLocaleString()}</strong>
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Minimum withdrawal ni TZS {minAmount.toLocaleString()} na kiasi kisizidi salio lako.
        </p>
        <label className="auth-field">
          <span>Kiasi (TZS)</span>
          <div className="auth-input">
            <input
              type="number"
              min={minAmount}
              max={balance}
              step="1"
              aria-label="Kiasi (TZS)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </label>
        <div className="my-4 rounded-2xl bg-secondary p-4 text-sm">
          <p className="flex justify-between">
            <span>Makato (20%)</span>
            <strong>TZS {fee.toLocaleString()}</strong>
          </p>
          <p className="mt-2 flex justify-between">
            <span>Kiasi baada ya makato</span>
            <strong>TZS {net.toLocaleString()}</strong>
          </p>
        </div>
        <label className="auth-field">
          <span>Namba ya simu</span>
          <div className="auth-input">
            <input
              aria-label="Namba ya simu"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </label>
        <Button className="auth-submit" disabled={busy || !ready} onClick={() => void request()}>
          {busy ? "Inahifadhi..." : "Withdrawal"}
        </Button>
        {notice && (
          <p role="status" className={notice === "SALIO HALITOSHI" ? "auth-error text-destructive" : "auth-message"}>
            {notice}
          </p>
        )}
        <h2 className="mt-6 text-lg font-bold">Withdrawal History</h2>
        {history.length === 0 ? (
          <p>Hakuna ombi bado.</p>
        ) : (
          history.map((item) => (
            <article className="card-soft mt-3 p-3" key={item.id}>
              <strong>TZS {Number(item.amount).toLocaleString()}</strong>
              <p
                className={
                  item.status === "paid" ? "text-success font-bold" : "text-amber-600 font-semibold"
                }
              >
                {item.status === "paid"
                  ? "Paid"
                  : item.status === "pending"
                    ? "Pending"
                    : "Rejected"}
              </p>
              <p>{new Date(item.created_at).toLocaleString()}</p>
              <p>
                Makato: TZS {Number(item.fee || 0).toLocaleString()} · Baada ya makato: TZS{" "}
                {Number(item.net_amount ?? item.amount).toLocaleString()}
              </p>
              <Button variant="outline" className="mt-2" onClick={() => setReceipt(item)}>
                Risiti
              </Button>
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
      <Dialog open={requirementsOpen} onOpenChange={setRequirementsOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogTitle>Vigezo vya withdrawal</DialogTitle>
          <DialogDescription>
            {eligibility?.is_premium
              ? `Alika watu 5 wawe active (${eligibility?.active_referrals || 0}/5) au upgrade kwenda VIP`
              : `Alika watu 10 (${eligibility?.referrals || 0}/10) au upgrade kwenda Premium`}
          </DialogDescription>
          <Button asChild>
            <a href={eligibility?.is_premium ? "/payment?type=vip" : "/payment?type=premium"}>
              Upgrade
            </a>
          </Button>
          <Button variant="outline" onClick={() => setRequirementsOpen(false)}>
            Rudi nyuma
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!receipt}
        onOpenChange={(open) => {
          if (!open) setReceipt(null);
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8">
          <div className="mx-auto my-3 grid size-12 place-items-center rounded-full bg-secondary text-2xl text-success">
            ✓
          </div>
          <DialogTitle className="text-center text-2xl">
            {receipt?.status === "paid" ? "Ombi limekamilishwa" : "Ombi limepokelewa"}
          </DialogTitle>
          <DialogDescription className="text-center">
            Transaction Receipt ·{" "}
            {receipt?.status === "paid"
              ? "Paid"
              : receipt?.status === "rejected"
                ? "Rejected"
                : "Pending"}
          </DialogDescription>
          <dl className="my-3 space-y-3 rounded-2xl bg-secondary p-5 text-sm">
            <div className="flex justify-between gap-3">
              <dt>Sent To</dt>
              <dd className="font-bold">{receipt?.phone}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Requested Amount</dt>
              <dd>{Number(receipt?.amount || 0).toLocaleString()} TZS</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Makato (20%)</dt>
              <dd>{Number(receipt?.fee || 0).toLocaleString()} TZS</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Amount</dt>
              <dd className="font-bold text-success">
                {Number(receipt?.net_amount ?? receipt?.amount ?? 0).toLocaleString()} TZS
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-3">
              <dt className="shrink-0">Ref ID</dt>
              <dd className="break-all text-right font-mono text-xs">
                GOT
                {String(receipt?.id || "")
                  .replaceAll("-", "")
                  .toUpperCase()}
              </dd>
            </div>
          </dl>
          <Button className="w-full" onClick={() => setReceipt(null)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
      <ActivationRequiredDialog open={activationOpen} onClose={() => setActivationOpen(false)} />
    </main>
  );
}
