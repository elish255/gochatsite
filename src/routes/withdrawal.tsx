
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { platform } from "@/integrations/supabase/platform";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/withdrawal")({
  component: WithdrawalPage,
});

function WithdrawalPage() {
  const nav = useNavigate();

  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("100000");
  const [phone, setPhone] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  const value = Number(amount) || 0;
  const fee = Math.round(value * 20) / 100;
  const net = Math.max(0, value - fee);

  const isVip = Boolean(account?.is_vip);
  const isPremium = Boolean(account?.is_premium);
  const taxPaid = Boolean(account?.vip_tax_paid);

  const minimumWithdrawal =
    isPremium && !isVip ? 300000 : 100000;

  async function load() {
    const {
      data: { user },
    } = await platform.auth.getUser();

    if (!user) {
      await nav({ to: "/login", replace: true });
      return;
    }

    const [profile, withdrawals] = await Promise.all([
      platform
        .from("gochati_users")
        .select(
          "balance, phone, account_status, is_premium, is_vip, vip_tax_paid",
        )
        .eq("id", user.id)
        .single(),

      platform
        .from("gochati_withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (profile.error || withdrawals.error) {
      setNotice(
        profile.error?.message ||
          withdrawals.error?.message ||
          "Imeshindikana kupakia taarifa.",
      );
      setReady(false);
      return;
    }

    setAccount(profile.data);
    setBalance(Number(profile.data?.balance || 0));
    setPhone((current) => current || profile.data?.phone || "");
    setHistory(withdrawals.data || []);

    setReceipt((current: any) =>
      current
        ? withdrawals.data?.find(
            (item: any) => item.id === current.id,
          ) || current
        : null,
    );

    setReady(true);
  }

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => void load(), 15000);
    const refresh = () => void load();

    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  async function request() {
    if (!ready || busy || !account) return;

    if (account.account_status !== "active") {
      setNotice("Akaunti yako haijawezeshwa.");
      return;
    }

    // NORMAL ACCOUNT
    if (!isPremium && !isVip) {
      if (balance < 100000) {
        setNotice(
          `Unahitaji salio la TZS 100,000. Salio lako ni TZS ${balance.toLocaleString()}.`,
        );
        return;
      }

      window.location.href = "/payment?type=premium";
      return;
    }

    // PREMIUM ACCOUNT
    if (isPremium && !isVip) {
      if (!Number.isSafeInteger(value) || value < 300000) {
        setNotice(
          "Kwa akaunti ya Premium, kiasi cha withdrawal lazima kiwe TZS 300,000 au zaidi.",
        );
        return;
      }

      if (balance < 300000) {
        setNotice(
          `Unahitaji salio la TZS 300,000. Salio lako ni TZS ${balance.toLocaleString()}.`,
        );
        return;
      }

      window.location.href = "/payment?type=vip";
      return;
    }

    // VIP ACCOUNT
    if (isVip && !taxPaid) {
      window.location.href = "/payment?type=tax";
      return;
    }

    if (!Number.isSafeInteger(value) || value < 100000) {
      setNotice("Minimum withdrawal ni TZS 100,000.");
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

    setBusy(true);
    setNotice("");

    try {
      const { data: withdrawalId, error } = await platform.rpc(
        "gochati_request_withdrawal",
        {
          p_amount: value,
          p_phone: phone.trim(),
        },
      );

      if (error) {
        setNotice(error.message);
        return;
      }

      setReceipt({
        id: withdrawalId,
        phone: phone.trim(),
        amount: value,
        fee,
        net_amount: net,
        status: "pending",
      });

      await load();
    } catch (error: any) {
      setNotice(error?.message || "Ombi limeshindikana.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-content">
        <h1>Withdrawal</h1>

        <p>
          Salio: <strong>TZS {balance.toLocaleString()}</strong>
        </p>

        <div className="my-4 rounded-2xl bg-secondary p-4 text-sm">
          <p className="font-bold">Hali ya akaunti</p>

          <p className="mt-2">
            {isVip
              ? "VIP"
              : isPremium
                ? "Premium"
                : "Normal"}
          </p>

          {isVip && (
            <p className="mt-1">
              Kodi: {taxPaid ? "Imelipwa" : "Haijalipwa"}
            </p>
          )}

          {!isPremium && !isVip && (
            <p className="mt-2">
              Kiwango cha Premium: TZS 100,000
            </p>
          )}

          {isPremium && !isVip && (
            <p className="mt-2">
              Minimum withdrawal: TZS 300,000
              <br />
              Kiwango cha upgrade VIP: TZS 300,000
            </p>
          )}

          {isVip && (
            <p className="mt-2">
              Minimum withdrawal: TZS 100,000
            </p>
          )}
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Minimum withdrawal ni TZS{" "}
          {minimumWithdrawal.toLocaleString()}.
          Kiasi kisizidi salio lako.
        </p>

        <label className="auth-field">
          <span>Kiasi (TZS)</span>
          <div className="auth-input">
            <input
              type="number"
              min={minimumWithdrawal}
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
            <span>Kiasi utakachopokea</span>
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

        <Button
          className="auth-submit"
          disabled={busy || !ready}
          onClick={() => void request()}
        >
          {busy ? "Inahifadhi..." : "Withdrawal"}
        </Button>

        {notice && (
          <p
            role="status"
            className={
              notice === "SALIO HALITOSHI"
                ? "auth-error text-destructive"
                : "auth-message"
            }
          >
            {notice}
          </p>
        )}

        <h2 className="mt-6 text-lg font-bold">
          Withdrawal History
        </h2>

        {history.length === 0 ? (
          <p>Hakuna ombi bado.</p>
        ) : (
          history.map((item) => (
            <article className="card-soft mt-3 p-3" key={item.id}>
              <strong>
                TZS {Number(item.amount).toLocaleString()}
              </strong>

              <p
                className={
                  item.status === "paid"
                    ? "text-success font-bold"
                    : "text-amber-600 font-semibold"
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
                Makato (20%): TZS{" "}
                {Number(item.fee || 0).toLocaleString()}
              </p>

              <p>
                Utapokea: TZS{" "}
                {Number(
                  item.net_amount ?? item.amount,
                ).toLocaleString()}
              </p>

              <Button
                variant="outline"
                className="mt-2"
                onClick={() => setReceipt(item)}
              >
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
            {receipt?.status === "paid"
              ? "Ombi limekamilishwa"
              : "Ombi limepokelewa"}
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
              <dd>
                {Number(receipt?.amount || 0).toLocaleString()} TZS
              </dd>
            </div>

            <div className="flex justify-between gap-3">
              <dt>Makato (20%)</dt>
              <dd>
                {Number(receipt?.fee || 0).toLocaleString()} TZS
              </dd>
            </div>

            <div className="flex justify-between gap-3">
              <dt>Amount utakayopokea</dt>
              <dd className="font-bold text-success">
                {Number(
                  receipt?.net_amount ?? receipt?.amount ?? 0,
                ).toLocaleString()}{" "}
                TZS
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

          <Button
            className="w-full"
            onClick={() => setReceipt(null)}
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
