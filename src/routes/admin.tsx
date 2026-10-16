import { PasswordHelp } from "@/components/gochati/AuthCallbacks";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { platform } from "@/integrations/netlify/client";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/admin")({ component: AdminPage });
type Audience = "all" | "premium" | "normal" | "active" | "inactive";
function AdminPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentBusy, setPaymentBusy] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [broadcast, setBroadcast] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [notifyUser, setNotifyUser] = useState<{ id: string; name: string } | null>(null);
  const [userMessage, setUserMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [balanceAdjustments, setBalanceAdjustments] = useState<Record<string, string>>({});
  const [balanceBusy, setBalanceBusy] = useState<string>("");
  async function load() {
    const {
      data: { user: current },
    } = await platform.auth.getUser();
    setUser(current);
    if (!current) {
      setReady(true);
      setAuthorized(false);
      return;
    }
    const { data: admin, error: adminError } = await platform
      .from("gochati_admins")
      .select("user_id")
      .eq("user_id", current.id)
      .maybeSingle();
    if (adminError || !admin) {
      setNotice("Akaunti hii haina ruhusa ya admin. Tumia akaunti ya admin ya Gochati.");
      setReady(true);
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
    const [u, w] = await Promise.all([
      platform
        .from("gochati_users")
        .select(
          "id,full_name,username,phone,country,account_status,activation_paid,is_premium,is_vip,referral_count,balance,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      platform
        .from("gochati_withdrawals")
        .select("id,user_id,amount,status,created_at,phone")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);
    const paymentsResult = await platform
      .from("gochati_payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    setPayments(paymentsResult.data || []);
    if (u.error || w.error || paymentsResult.error)
      setNotice(
        u.error?.message ||
          w.error?.message ||
          paymentsResult.error?.message ||
          "Imeshindwa kupakia data.",
      );
    setRows(u.data || []);
    setWithdrawals(w.data || []);
    setReady(true);
  }
  useEffect(() => {
    void load();
  }, []);
  async function login(e: FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setNotice("");
    const { error } = await platform.auth.signInWithPassword({ email: email.trim(), password });
    setLoggingIn(false);
    if (error) {
      setNotice("Email au password si sahihi.");
      return;
    }
    await load();
  }
  async function updateUser(id: string, patch: Record<string, unknown>) {
    const { error } = await platform.from("gochati_users").update(patch).eq("id", id);
    setNotice(error?.message || "Mabadiliko yamehifadhiwa.");
    await load();
  }
  async function adjustBalance(id: string, current: number, mode: "add" | "subtract") {
    const amount = Number(balanceAdjustments[id] || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice("Weka kiasi sahihi cha kuongeza au kupunguza balance.");
      return;
    }
    if (mode === "subtract" && amount > current) {
      setNotice("Kiasi cha kupunguza hakiwezi kuzidi balance ya mtumiaji.");
      return;
    }
    setBalanceBusy(id);
    setNotice("");
    const { data: savedBalance, error } = await platform.rpc("gochati_admin_adjust_balance", {
      user_id: id,
      delta: mode === "add" ? amount : -amount,
    });
    setBalanceBusy("");
    if (error) {
      setNotice("Imeshindwa kubadilisha balance: " + error.message);
      return;
    }
    setNotice(`Balance ya majaribio imesasishwa: TZS ${Number(savedBalance).toLocaleString()}.`);
    setBalanceAdjustments((prev) => ({ ...prev, [id]: "" }));
    await load();
  }
  async function notify(targetId?: string) {
    if (!broadcast.trim()) {
      setNotice("Andika ujumbe kwanza.");
      return;
    }
    let targets = rows;
    if (targetId) {
      targets = rows.filter((row) => row.id === targetId);
    } else if (audience === "premium") {
      targets = rows.filter((row) => row.is_premium);
    } else if (audience === "normal") {
      targets = rows.filter((row) => !row.is_premium);
    } else if (audience === "active") {
      targets = rows.filter((row) => row.account_status === "active" && row.activation_paid);
    } else if (audience === "inactive") {
      targets = rows.filter((row) => row.account_status !== "active" || !row.activation_paid);
    }
    if (!targets.length) {
      setNotice("Hakuna watumiaji kwenye kundi hilo.");
      return;
    }
    const payload = targets.map((row) => ({ user_id: row.id, message: broadcast.trim() }));
    const { error } = await platform.from("gochati_notifications").insert(payload);
    setNotice(error?.message || `Notification imetumwa kwa watumiaji ${targets.length}.`);
    if (!error) setBroadcast("");
  }
  async function notifySelected() {
    if (!notifyUser || !userMessage.trim()) {
      setNotice("Andika ujumbe wa kumtumia mtumiaji.");
      return;
    }
    setSending(true);
    const { error } = await platform
      .from("gochati_notifications")
      .insert({ user_id: notifyUser.id, message: userMessage.trim() });
    setSending(false);
    if (error) {
      setNotice("Imeshindwa kutuma notification: " + error.message);
      return;
    }
    setNotice("Notification imetumwa kwa " + notifyUser.name + ".");
    setNotifyUser(null);
    setUserMessage("");
  }
  async function markPaid(id: string) {
    const { error } = await platform
      .from("gochati_withdrawals")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    setNotice(error?.message || "Withdrawal ya majaribio imewekwa Paid; hakuna pesa iliyotumwa.");
    await load();
  }
  const activeRows = useMemo(
    () => rows.filter((u) => u.account_status === "active" && u.activation_paid),
    [rows],
  );
  const inactiveRows = useMemo(
    () => rows.filter((u) => u.account_status !== "active" || !u.activation_paid),
    [rows],
  );
  const visibleRows =
    filter === "active" ? activeRows : filter === "inactive" ? inactiveRows : rows;
  if (!ready)
    return (
      <main className="auth-page" aria-busy="true">
        <section className="auth-content">
          <h1>Gochati Admin</h1>
          <p className="auth-subtitle" role="status">
            Inakagua akaunti na ruhusa...
          </p>
          <div className="h-12 animate-pulse rounded-xl bg-muted" />
          <div className="mt-4 h-12 animate-pulse rounded-xl bg-muted" />
        </section>
      </main>
    );
  if (!user || !authorized)
    return (
      <main className="auth-page">
        <section className="auth-content">
          <img
            src="/gochat/logo.png"
            alt="Gochati.site"
            width={88}
            height={88}
            className="mx-auto mb-4 rounded-2xl object-contain"
          />
          <h1>Gochati Admin Login</h1>
          <p className="auth-subtitle">Ingia kwa email na password ya admin iliyoidhinishwa.</p>
          {notice && (
            <p role="status" className="auth-error">
              {notice}
            </p>
          )}
          <form onSubmit={login}>
            <label className="auth-field">
              <span>Email ya admin</span>
              <div className="auth-input">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  placeholder="admin@example.com"
                />
              </div>
            </label>
            <label className="auth-field">
              <span>Password</span>
              <div className="auth-input">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>
            <Button className="auth-submit" type="submit" disabled={loggingIn}>
              {loggingIn ? "Inaingia..." : "INGIA ADMIN"}
            </Button>
          </form>
          <PasswordHelp />
        </section>
      </main>
    );
  return (
    <main className="auth-page" style={{ maxWidth: 1100, margin: "auto" }}>
      <section className="auth-content" style={{ maxWidth: 1000 }}>
        <img
          src="/gochat/logo.png"
          alt="Gochati.site"
          width={64}
          height={64}
          className="mb-3 rounded-xl object-contain"
        />
        <h1>Gochati Admin</h1>
        <p className="auth-subtitle">
          Usimamizi wa akaunti na ada za SplashPay. Balance na withdrawal ni majaribio; hakuna pesa
          inayotumwa.
        </p>
        {notice && (
          <p role="status" className="auth-message">
            {notice}
          </p>
        )}
        {ready && (
          <>
            <section className="card-soft mt-4 p-4">
              <h2 className="text-xl font-bold">Malipo ya SplashPay</h2>
              <p className="text-sm">
                Ada za activation, Premium na VIP. Uthibitisho unatoka SplashPay.
              </p>
              {payments.length === 0 ? (
                <p>Hakuna malipo bado.</p>
              ) : (
                payments.map((payment) => (
                  <article key={payment.id} className="mt-3 border-t border-border pt-3">
                    <strong>
                      {payment.purpose} · TZS {Number(payment.amount).toLocaleString()}
                    </strong>
                    <p>
                      {rows.find((row) => row.id === payment.user_id)?.email || payment.user_id}
                    </p>
                    <p className="break-all">{payment.order_id}</p>
                    <p>
                      {payment.phone} · {payment.status} ·{" "}
                      {new Date(payment.created_at).toLocaleString()}
                    </p>
                    <Button
                      variant="outline"
                      disabled={paymentBusy === payment.id || payment.status === "success"}
                      onClick={async () => {
                        setPaymentBusy(payment.id);
                        try {
                          const response = await fetch("/api/gochati-payment", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "status", reference: payment.order_id }),
                          });
                          const data = await response.json();
                          if (!response.ok) throw new Error(data.message);
                          setNotice("Hali ya malipo: " + data.payment_status);
                          await load();
                        } catch (e) {
                          setNotice(
                            e instanceof Error ? e.message : "Imeshindikana kuthibitisha malipo.",
                          );
                        } finally {
                          setPaymentBusy("");
                        }
                      }}
                    >
                      Thibitisha kupitia SplashPay
                    </Button>
                  </article>
                ))
              )}
            </section>
            <div className="grid gap-3 sm:grid-cols-3">
              <button className="card-soft p-4 text-left" onClick={() => setFilter("all")}>
                <p className="text-sm">Watumiaji wote</p>
                <strong className="text-2xl">{rows.length}</strong>
              </button>
              <button className="card-soft p-4 text-left" onClick={() => setFilter("active")}>
                <p className="text-sm">Active users</p>
                <strong className="text-2xl text-emerald-600">{activeRows.length}</strong>
              </button>
              <button className="card-soft p-4 text-left" onClick={() => setFilter("inactive")}>
                <p className="text-sm">Inactive users</p>
                <strong className="text-2xl text-amber-600">{inactiveRows.length}</strong>
              </button>
            </div>
            <div className="card-soft mt-4 p-4">
              <h2 className="font-bold">Tuma notification</h2>
              <textarea
                className="mt-2 w-full rounded-xl border p-3 text-black"
                value={broadcast}
                onChange={(e) => setBroadcast(e.target.value)}
                placeholder="Andika ujumbe..."
              />
              <label className="mt-3 block text-sm font-semibold">Wapokeaji</label>
              <select
                className="mt-1 w-full rounded-xl border p-3 text-black"
                value={audience}
                onChange={(e) => setAudience(e.target.value as Audience)}
              >
                <option value="all">Watumiaji wote</option>
                <option value="premium">Premium users tu</option>
                <option value="normal">Normal users tu</option>
                <option value="active">Active users tu</option>
                <option value="inactive">Inactive users tu</option>
              </select>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button onClick={() => void notify()}>Tuma notification</Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await platform.auth.signOut();
                    setUser(null);
                    setAuthorized(false);
                    setRows([]);
                  }}
                >
                  Toka
                </Button>
              </div>
            </div>
            {notifyUser && (
              <div
                className="card-soft mt-4 p-4"
                role="dialog"
                aria-label="Tuma notification kwa mtumiaji"
              >
                <h2 className="font-bold">Tuma notification kwa {notifyUser.name}</h2>
                <textarea
                  className="mt-2 w-full rounded-xl border p-3 text-black"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  placeholder="Andika ujumbe wa kumtumia mtumiaji..."
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    disabled={sending || !userMessage.trim()}
                    onClick={() => void notifySelected()}
                  >
                    {sending ? "Inatuma..." : "Tuma ujumbe"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNotifyUser(null);
                      setUserMessage("");
                    }}
                  >
                    Ghairi
                  </Button>
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold">Watumiaji ({visibleRows.length})</h2>
              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  onClick={() => setFilter("all")}
                >
                  Wote
                </Button>
                <Button
                  variant={filter === "active" ? "default" : "outline"}
                  onClick={() => setFilter("active")}
                >
                  Active
                </Button>
                <Button
                  variant={filter === "inactive" ? "default" : "outline"}
                  onClick={() => setFilter("inactive")}
                >
                  Inactive
                </Button>
              </div>
            </div>
            <div className="mt-3 grid gap-3">
              {visibleRows.map((u) => (
                <article className="card-soft p-4" key={u.id}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <strong>{u.full_name}</strong> (@{u.username})
                      <p>
                        {u.phone} · {u.country}
                      </p>
                      <p>Usajili: {new Date(u.created_at).toLocaleString()}</p>
                      <p>
                        Hali: {u.account_status} · Paid: {u.activation_paid ? "Ndiyo" : "Hapana"} ·{" "}
                        {u.is_premium ? "PREMIUM" : "Normal"} · {u.is_vip ? "VIP" : "Non-VIP"} ·
                        Walioalikwa: {u.referral_count || 0} · Balance: TZS{" "}
                        {Number(u.balance || 0).toLocaleString()}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          aria-label={`Kiasi cha kubadilisha balance ya ${u.username}`}
                          type="number"
                          min="1"
                          step="1"
                          value={balanceAdjustments[u.id] || ""}
                          onChange={(e) =>
                            setBalanceAdjustments((prev) => ({ ...prev, [u.id]: e.target.value }))
                          }
                          placeholder="Kiasi (TZS)"
                          className="w-36 rounded-lg border p-2 text-black"
                        />
                        <Button
                          disabled={balanceBusy === u.id}
                          onClick={() => void adjustBalance(u.id, Number(u.balance || 0), "add")}
                        >
                          + Ongeza balance ya majaribio
                        </Button>
                        <Button
                          variant="outline"
                          disabled={balanceBusy === u.id}
                          onClick={() =>
                            void adjustBalance(u.id, Number(u.balance || 0), "subtract")
                          }
                        >
                          − Punguza balance
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() =>
                          void updateUser(u.id, { activation_paid: true, account_status: "active" })
                        }
                      >
                        Washa akaunti (manual)
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void updateUser(u.id, { account_status: "deactivated" })}
                      >
                        Deactivate
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void updateUser(u.id, { account_status: "banned" })}
                      >
                        Ban
                      </Button>
                      {u.account_status === "banned" && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            void updateUser(u.id, {
                              account_status: u.activation_paid ? "active" : "pending",
                            })
                          }
                        >
                          Unban
                        </Button>
                      )}
                      <Button
                        variant={u.is_premium ? "default" : "outline"}
                        onClick={() => void updateUser(u.id, { is_premium: !u.is_premium })}
                      >
                        {u.is_premium ? "Remove Premium" : "Make Premium"}
                      </Button>
                      <Button
                        variant={u.is_vip ? "default" : "outline"}
                        onClick={() => void updateUser(u.id, { is_vip: !u.is_vip })}
                      >
                        {u.is_vip ? "Remove VIP" : "Make VIP"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNotifyUser({
                            id: u.id,
                            name: u.full_name || u.username || "mtumiaji",
                          });
                          setUserMessage("");
                          setNotice("");
                        }}
                      >
                        Notify user
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <h2 className="mt-8 text-xl font-bold">Withdrawal za majaribio</h2>
            <div className="mt-3 grid gap-3">
              {withdrawals.map((w) => (
                <article className="card-soft p-4" key={w.id}>
                  <p>
                    User: {w.user_id} · TZS {Number(w.amount).toLocaleString()} · {w.phone}
                  </p>
                  <p>
                    Status: <strong>{w.status}</strong> · {new Date(w.created_at).toLocaleString()}
                  </p>
                  {w.status === "pending" && (
                    <Button className="mt-2" onClick={() => void markPaid(w.id)}>
                      Kamilisha simulation
                    </Button>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
