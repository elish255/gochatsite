import { logoUrl } from "@/lib/gochati-media";
import { PasswordHelp } from "@/components/gochati/AuthCallbacks";
import { AdminSms } from "@/components/gochati/AdminSms";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { platform } from "@/integrations/netlify/client";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Users,
  Search,
  LayoutDashboard,
  CreditCard,
  Bell,
  MessageSquare,
  Wallet,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
export const Route = createFileRoute("/admin")({ component: AdminPage });
type Audience = "all" | "premium" | "normal" | "active" | "inactive";
function AdminPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [smsRecipient, setSmsRecipient] = useState<{
    id: string;
    name: string;
    phone: string;
  } | null>(null);
  const [withdrawalBusy, setWithdrawalBusy] = useState("");
  const [section, setSection] = useState("users");
  const [search, setSearch] = useState("");
  const [searchRows, setSearchRows] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
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
    const { error } = email.includes("@")
      ? await platform.auth.signInWithPassword({ email: email.trim(), password })
      : await platform.auth.signInWithUsername({ username: email.trim(), password });
    setLoggingIn(false);
    if (error) {
      setNotice("Username/email au password si sahihi.");
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
    setNotice(`Balance imesasishwa: TZS ${Number(savedBalance).toLocaleString()}.`);
    setBalanceAdjustments((prev) => ({ ...prev, [id]: "" }));
    await load();
  }
  async function notify() {
    if (!broadcast.trim()) {
      setNotice("Andika ujumbe kwanza.");
      return;
    }
    setSending(true);
    const { data, error } = await platform.rpc("gochati_broadcast", {
      audience,
      message: broadcast.trim(),
    });
    setSending(false);
    setNotice(error?.message || `Notification imetumwa kwa watumiaji ${data}.`);
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
    if (withdrawalBusy) return;
    setWithdrawalBusy(id);
    const { data, error } = await platform
      .from("gochati_withdrawals")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    setWithdrawalBusy("");
    setNotice(
      error?.message ||
        (!data?.length
          ? "Withdrawal hii tayari imeshughulikiwa."
          : data[0].sms_status === "queued"
            ? "Withdrawal imewekwa Paid. SMS imekubaliwa kutumwa."
            : "Withdrawal imewekwa Paid lakini SMS imeshindikana. Tumia Tuma SMS kwa mtumiaji huyu baada ya kukagua huduma."),
    );
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
  useEffect(() => {
    if (!authorized || !search.trim()) {
      setSearchRows(null);
      setSearching(false);
      setSearchError("");
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      const { data, error } = await platform
        .from("gochati_users")
        .select("*")
        .search(search.trim())
        .order("created_at", { ascending: false })
        .limit(1000);
      if (!cancelled) {
        setSearchRows(data || []);
        setSearchError(error?.message || "");
        setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, authorized, rows]);
  const visibleRows = (searchRows ?? rows).filter(
    (u) =>
      filter === "all" ||
      (filter === "active"
        ? u.account_status === "active" && u.activation_paid
        : u.account_status !== "active" || !u.activation_paid),
  );
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
            src={logoUrl}
            alt="Gochati.online"
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
                  type="text"
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
    <main className="admin-workspace">
      <div
        className="admin-menu-wrap"
        onMouseEnter={() => setMenuOpen(true)}
        onMouseLeave={() => setMenuOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setMenuOpen(false);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setMenuOpen(false);
        }}
      >
        <Button
          variant="outline"
          className="admin-menu-trigger"
          aria-expanded={menuOpen}
          aria-controls="admin-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <Menu size={20} /> Menyu ya admin
        </Button>
        <aside id="admin-navigation" className="admin-sidebar" hidden={!menuOpen}>
          <a href="/" className="admin-brand">
            <img src={logoUrl} alt="Gochati.online" width={42} height={42} />
            <span>
              gochati<span className="text-primary">.online</span>
              <small>ADMIN CONSOLE</small>
            </span>
          </a>
          <p className="admin-nav-label">USIMAMIZI</p>
          <nav aria-label="Sehemu za admin">
            {[
              { id: "users", label: "Watumiaji", icon: Users },
              { id: "payments", label: "Malipo", icon: CreditCard },
              { id: "messages", label: "Notifications", icon: Bell },
              { id: "sms", label: "SMS", icon: MessageSquare },
              { id: "withdrawals", label: "Withdrawal", icon: Wallet },
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={section === id ? "secondary" : "ghost"}
                className="admin-nav-button"
                aria-pressed={section === id}
                onClick={() => {
                  setSection(id);
                  setSmsRecipient(null);
                  setMenuOpen(false);
                }}
              >
                <Icon size={18} />
                {label}
              </Button>
            ))}
          </nav>
          <div className="admin-sidebar-footer">
            <a href="/" className="flex items-center gap-2 text-sm">
              <ArrowUpRight size={16} /> Fungua tovuti
            </a>
            <Button
              variant="ghost"
              className="mt-3 w-full justify-start"
              onClick={async () => {
                await platform.auth.signOut();
                setUser(null);
                setAuthorized(false);
                setRows([]);
              }}
            >
              <LogOut size={16} /> Toka kwenye akaunti
            </Button>
          </div>
        </aside>
      </div>
      <section className="admin-main">
        <header className="admin-heading">
          <div>
            <p className="admin-eyebrow">
              <LayoutDashboard size={14} /> DASHBOARD
            </p>
            <h1>
              {section === "users"
                ? "Watumiaji"
                : section === "payments"
                  ? "Malipo ya huduma"
                  : section === "messages" || section === "sms"
                    ? "Mawasiliano"
                    : "Maombi ya withdrawal"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Dhibiti akaunti, huduma na mawasiliano ya Gochati.online.
            </p>
          </div>
          <span className="admin-session">
            <span /> Admin
          </span>
        </header>
        <p className="admin-disclosure">Balance na withdrawal hazitumi pesa halisi.</p>
        {notice && (
          <p role="status" className="auth-message">
            {notice}
          </p>
        )}
        {ready && (
          <>
            {section === "sms" && (
              <>
                {smsRecipient && (
                  <Button variant="outline" onClick={() => setSmsRecipient(null)}>
                    Rudi kwenye SMS za makundi
                  </Button>
                )}
                <AdminSms key={smsRecipient?.id || "groups"} recipient={smsRecipient} />
              </>
            )}
            {section === "payments" && (
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
                              body: JSON.stringify({
                                action: "status",
                                reference: payment.order_id,
                              }),
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
            )}
            {section === "users" && (
              <div className="admin-metrics grid gap-3 sm:grid-cols-3">
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
            )}
            {section === "messages" && (
              <div className="card-soft mt-4 p-4">
                <h2 className="font-bold">Tuma notification</h2>
                <textarea
                  className="mt-2 w-full rounded-xl border p-3 bg-background text-foreground"
                  value={broadcast}
                  onChange={(e) => setBroadcast(e.target.value)}
                  placeholder="Andika ujumbe..."
                />
                <label className="mt-3 block text-sm font-semibold">Wapokeaji</label>
                <select
                  className="mt-1 w-full rounded-xl border p-3 bg-background text-foreground"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as Audience)}
                >
                  <option value="all">Watumiaji wote</option>
                  <option value="premium">Premium users tu</option>
                  <option value="normal">Normal users tu</option>
                  <option value="active">Active users tu</option>
                  <option value="inactive">Hawajalipia Activation fee</option>
                </select>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button disabled={sending} onClick={() => void notify()}>
                    {sending ? "Inatuma..." : "Tuma notification"}
                  </Button>
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
            )}
            {notifyUser && (
              <div
                className="card-soft mt-4 p-4"
                role="dialog"
                aria-label="Tuma notification kwa mtumiaji"
              >
                <h2 className="font-bold">Tuma notification kwa {notifyUser.name}</h2>
                <textarea
                  className="mt-2 w-full rounded-xl border p-3 bg-background text-foreground"
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
            {section === "users" && (
              <>
                <div className="admin-search">
                  <Search size={20} />
                  <input
                    type="search"
                    aria-label="Tafuta watumiaji"
                    placeholder="Tafuta kwa jina, username au namba ya simu..."
                    maxLength={100}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
                      Futa
                    </Button>
                  )}
                </div>
                {searching && (
                  <p role="status" className="text-sm text-muted-foreground">
                    Inatafuta watumiaji...
                  </p>
                )}
                {searchError && (
                  <p role="alert" className="auth-error">
                    {searchError}
                  </p>
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
                  {!searching && !searchError && visibleRows.length === 0 && (
                    <div className="admin-empty">
                      <Users size={32} />
                      <h3>Hakuna mtumiaji aliyepatikana</h3>
                      <p>Badilisha jina, username, namba au kichujio.</p>
                    </div>
                  )}
                  {!searching &&
                    !searchError &&
                    visibleRows.map((u) => (
                      <article className="card-soft admin-user-card p-5" key={u.id}>
                        <div className="flex flex-wrap justify-between gap-2">
                          <div>
                            <strong>{u.full_name}</strong> (@{u.username})
                            <p>
                              {u.phone} · {u.country}
                            </p>
                            <p>Usajili: {new Date(u.created_at).toLocaleString()}</p>
                            <p>
                              Hali: {u.account_status} · Paid:{" "}
                              {u.activation_paid ? "Ndiyo" : "Hapana"} ·{" "}
                              {u.is_premium ? "PREMIUM" : "Normal"} · {u.is_vip ? "VIP" : "Non-VIP"}{" "}
                              · Walioalikwa: {u.referral_count || 0} · Balance: TZS{" "}
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
                                  setBalanceAdjustments((prev) => ({
                                    ...prev,
                                    [u.id]: e.target.value,
                                  }))
                                }
                                placeholder="Kiasi (TZS)"
                                className="w-36 rounded-lg border p-2 bg-background text-foreground"
                              />
                              <Button
                                disabled={balanceBusy === u.id}
                                onClick={() =>
                                  void adjustBalance(u.id, Number(u.balance || 0), "add")
                                }
                              >
                                + Ongeza balance
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
                                void updateUser(u.id, {
                                  activation_paid: true,
                                  account_status: "active",
                                })
                              }
                            >
                              Washa akaunti (manual)
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() =>
                                void updateUser(u.id, { account_status: "deactivated" })
                              }
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
                                setSmsRecipient({
                                  id: u.id,
                                  name: u.username || u.full_name || "mtumiaji",
                                  phone: u.phone,
                                });
                                setSection("sms");
                                setNotice("");
                              }}
                            >
                              <MessageSquare size={16} /> Tuma SMS
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
              </>
            )}
            {section === "withdrawals" && (
              <>
                <h2 className="mt-8 text-xl font-bold">Withdrawal</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Weka Paid baada ya kuthibitisha malipo mwenyewe. Hatua hii hutuma SMS ya
                  uthibitisho; haitumi pesa.
                </p>
                <div className="mt-3 grid gap-3">
                  {withdrawals.length === 0 && (
                    <p className="admin-empty">Hakuna ombi la withdrawal bado.</p>
                  )}
                  {withdrawals.map((w) => (
                    <article className="card-soft p-4" key={w.id}>
                      <p>
                        User: {w.user_id} · TZS {Number(w.amount).toLocaleString()} · {w.phone}
                      </p>
                      <p>
                        Makato: TZS {Number(w.fee || 0).toLocaleString()} · Baada ya makato: TZS{" "}
                        {Number(w.net_amount ?? w.amount).toLocaleString()}
                      </p>
                      <p>
                        Status:{" "}
                        <strong className={w.status === "paid" ? "text-success" : "text-amber-600"}>
                          {w.status === "paid"
                            ? "Paid"
                            : w.status === "pending"
                              ? "Pending"
                              : "Rejected"}
                        </strong>{" "}
                        · {new Date(w.created_at).toLocaleString()}
                      </p>
                      {w.status === "pending" && (
                        <Button
                          className="mt-2"
                          disabled={Boolean(withdrawalBusy)}
                          onClick={() => void markPaid(w.id)}
                        >
                          {withdrawalBusy === w.id ? "Inahifadhi na kutuma SMS..." : "Weka Paid"}
                        </Button>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
