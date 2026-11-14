import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { platform } from "@/integrations/supabase/platform";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/withdrawal")({
  component: WithdrawalPage,
});

type WithdrawalPrompt = "premium" | "vip" | "tax";

type WithdrawalAccount = {
  balance: number | string | null;
  phone: string | null;
  account_status: string;
  is_premium: boolean | null;
  is_vip: boolean | null;
  vip_tax_paid: boolean | null;
};

type WithdrawalRecord = {
  id: string;
  amount: number | string;
  fee?: number | string | null;
  net_amount?: number | string | null;
  phone: string;
  status: string;
  created_at: string;
};

type WithdrawalReceipt = Omit<WithdrawalRecord, "created_at"> & {
  created_at?: string;
};

const WITHDRAWAL_PROMPTS = {
  premium: {
    title: "Hongera! Umefikia kiwango cha withdrawal",
    description:
      "Ili kuendelea na withdrawal, upgrade akaunti yako kwenda Premium. Ada ya Premium ni TZS 32,000.",
    action: "Lipa Premium — TZS 32,000",
  },
  vip: {
    title: "Hongera! Umefikia kiwango cha VIP",
    description:
      "Salio lako limetimiza kiwango cha TZS 300,000. Upgrade kwenda VIP ili kuendelea na withdrawal. Ada ya VIP ni TZS 35,500.",
    action: "Lipa VIP — TZS 35,500",
  },
  tax: {
    title: "Malipo ya Tax ya VIP",
    description:
      "Lipa Tax ya TZS 50,000 ili kuendelea na withdrawal. Baada ya malipo kuthibitishwa, unaweza kutuma ombi lako.",
    action: "Lipa Tax — TZS 50,000",
  },
} satisfies Record<WithdrawalPrompt, { title: string; description: string; action: string }>;

function WithdrawalPage() {
  const nav = useNavigate();

  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("100000");
  const [phone, setPhone] = useState("");
  const [history, setHistory] = useState<WithdrawalRecord[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [account, setAccount] = useState<WithdrawalAccount | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [receipt, setReceipt] = useState<WithdrawalReceipt | null>(null);
  const [withdrawalPrompt, setWithdrawalPrompt] = useState<WithdrawalPrompt | null>(null);

  const value = Number(amount) || 0;
  const fee = Math.round(value * 20) / 100;
  const net = Math.max(0, value - fee);

  const isVip = Boolean(account?.is_vip);
  const isPremium = Boolean(account?.is_premium);
  const isPremiumOnly = isPremium && !isVip;
  const taxPaid = Boolean(account?.vip_tax_paid);
  const minimumWithdrawal = 100000;
  const minimumWithdrawalForAccount = isPremiumOnly ? 300000 : minimumWithdrawal;
  const insufficientBalanceNotice = isPremiumOnly
    ? "Huna Salio la Kutosha kufanya Withdrawal"
    : "Salio halitoshi kufanya Withdrawal.";
  const cooldownDurationMs = 30 * 60 * 1000;
  const lastWithdrawalAt = history[0]?.created_at ? Date.parse(history[0].created_at) : Number.NaN;
  const cooldownRemainingMs = Number.isFinite(lastWithdrawalAt)
    ? Math.max(0, lastWithdrawalAt + cooldownDurationMs - now)
    : 0;
  const cooldownActive = cooldownRemainingMs > 0;
  const cooldownCountdown = `${String(Math.floor(cooldownRemainingMs / 60000)).padStart(2, "0")}:${String(Math.floor((cooldownRemainingMs % 60000) / 1000)).padStart(2, "0")}`;

  const load = useCallback(async () => {
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
        .select("balance, phone, account_status, activation_paid, is_premium, is_vip, vip_tax_paid")
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
        profile.error?.message || withdrawals.error?.message || "Imeshindikana kupakia taarifa.",
      );
      setReady(false);
      return;
    }

    setAccount(profile.data);
    setBalance(Number(profile.data?.balance || 0));
    setPhone((current) => current || profile.data?.phone || "");
    setHistory(withdrawals.data || []);

    setReceipt((current) =>
      current
        ? withdrawals.data?.find((item: WithdrawalRecord) => item.id === current.id) || current
        : null,
    );

    setReady(true);
  }, [nav]);

  useEffect(() => {
    void load();

    const timer = window.setInterval(() => void load(), 15000);
    const refresh = () => void load();

    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function request() {
    if (!ready || busy || !account) return;

    setNotice("");

    if (account.account_status !== "active") {
      setNotice("Akaunti yako haijawezeshwa.");
      return;
    }

    if (cooldownActive) {
      setNotice(`Bado huwezi kufanya withdrawal. Subiri ${cooldownCountdown}.`);
      return;
    }

    if (!Number.isSafeInteger(value)) {
      setNotice("Kiasi cha withdrawal si sahihi.");
      return;
    }

    if (value < minimumWithdrawalForAccount) {
      setNotice(
        isPremiumOnly
          ? "Kiwango Cha chini kutoa ni 300,000"
          : "Salio halitoshi kufanya Withdrawal.",
      );
      return;
    }

    if (!/^[+\d ]{9,16}$/.test(phone.trim())) {
      setNotice("Weka namba sahihi ya simu.");
      return;
    }

    if (balance < minimumWithdrawalForAccount || value > balance) {
      setNotice(insufficientBalanceNotice);
      return;
    }

    if (!isVip) {
      setWithdrawalPrompt(isPremium ? "vip" : "premium");
      return;
    }

    if (!taxPaid) {
      setWithdrawalPrompt("tax");
      return;
    }

    setBusy(true);

    try {
      const { data: withdrawalId, error } = await platform.rpc("gochati_request_withdrawal", {
        p_amount: value,
        p_phone: phone.trim(),
      });

      if (error) {
        if (error.message.includes("WITHDRAWAL_COOLDOWN")) {
          setNotice("Kipindi cha kusubiri bado hakijaisha. Angalia muda uliosalia.");
          await load();
        } else if (error.message.includes("UPGRADE_REQUIRED_PREMIUM")) {
          setWithdrawalPrompt("premium");
        } else if (error.message.includes("UPGRADE_REQUIRED_VIP")) {
          setWithdrawalPrompt("vip");
        } else if (error.message.includes("TAX_PAYMENT_REQUIRED")) {
          setWithdrawalPrompt("tax");
        } else if (error.message.includes("INSUFFICIENT_BALANCE")) {
          setNotice(insufficientBalanceNotice);
        } else {
          setNotice(error.message);
        }
        return;
      }

      setReceipt({
        id: String(withdrawalId),
        phone: phone.trim(),
        amount: value,
        fee,
        net_amount: net,
        status: "pending",
      });

      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Ombi limeshindikana.");
    } finally {
      setBusy(false);
    }
  }

  const prompt = withdrawalPrompt ? WITHDRAWAL_PROMPTS[withdrawalPrompt] : null;

  return (
    <main className="auth-page">
      <section className="auth-content">
        <h1>Withdrawal</h1>

        <p>
          Salio: <strong>TZS {balance.toLocaleString()}</strong>
        </p>

        <div className="my-4 rounded-2xl bg-secondary p-4 text-sm">
          <p className="font-bold">Hali ya akaunti</p>
          <p className="mt-2">{isVip ? "VIP" : isPremium ? "Premium" : "Normal"}</p>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Kiwango cha chini cha withdrawal ni TZS {minimumWithdrawalForAccount.toLocaleString()}.
          Kiasi kisizidi salio lako.
        </p>

        <label className="auth-field">
          <span>Kiasi (TZS)</span>
          <div className="auth-input">
            <input
              type="number"
              min={minimumWithdrawalForAccount}
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

        {cooldownActive && (
          <p
            role="timer"
            className="mb-3 text-sm text-muted-foreground"
            aria-label={`Muda wa kusubiri: ${cooldownCountdown}`}
          >
            Withdrawal nyingine itaruhusiwa baada ya {cooldownCountdown}.
          </p>
        )}
        <Button
          className="auth-submit"
          disabled={busy || !ready || !account}
          onClick={() => void request()}
        >
          {busy ? "Inahifadhi..." : "Withdrawal"}
        </Button>

        {notice && (
          <p
            role="status"
            className={
              notice.startsWith("Salio halitoshi") || notice.startsWith("Huna Salio")
                ? "auth-error text-destructive"
                : "auth-message"
            }
          >
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

              <p>Makato (20%): TZS {Number(item.fee || 0).toLocaleString()}</p>

              <p>Utapokea: TZS {Number(item.net_amount ?? item.amount).toLocaleString()}</p>

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

      <Dialog
        open={Boolean(prompt)}
        onOpenChange={(open) => {
          if (!open) setWithdrawalPrompt(null);
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8">
          {prompt && (
            <>
              <DialogTitle className="text-center text-2xl">{prompt.title}</DialogTitle>
              <DialogDescription className="text-center leading-relaxed">
                {prompt.description}
              </DialogDescription>
              <Button
                className="w-full"
                onClick={() => {
                  if (withdrawalPrompt) {
                    window.location.assign(`/payment?type=${withdrawalPrompt}`);
                  }
                }}
              >
                {prompt.action}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setWithdrawalPrompt(null)}
              >
                Baadaye
              </Button>
            </>
          )}
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
              <dt>Amount utakayopokea</dt>
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
    </main>
  );
}
