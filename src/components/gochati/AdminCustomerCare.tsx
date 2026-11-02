import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, MessageCircle, ShieldBan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerCareChat } from "./CustomerCareChat";
import { careApi } from "./customer-care-api";
type Event = {
  id: string;
  kind: string;
  username: string | null;
  read_at: string | null;
  created_at: string;
  user_id: string | null;
};
type Thread = {
  id: string;
  username: string;
  full_name: string;
  body: string;
  kind: string;
  created_at: string;
  unread: number;
};

export function AdminCareNotifications({ onOpen }: { onOpen: () => void }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [popup, setPopup] = useState<Event | null>(null);
  useEffect(() => {
    let active = true,
      last: string | undefined;
    async function load() {
      try {
        const result = await careApi({ action: "events" });
        if (!active) return;
        setEvents(result.data);
        setError("");
        const newest = result.data[0];
        if (newest && last !== undefined && BigInt(newest.id) > BigInt(last)) {
          setPopup(newest);
        }
        if (newest) last = String(newest.id);
        else if (last === undefined) last = "0";
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Arifa hazijapatikana.");
      }
    }
    void load();
    const timer = setInterval(() => void load(), 10000);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .getRegistration("/")
        .then((r) => r?.pushManager?.getSubscription())
        .then((s) => {
          if (active) setEnabled(!!s);
        })
        .catch(() => {});
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!popup) return;
    const timer = setTimeout(() => setPopup(null), 8000);
    return () => clearTimeout(timer);
  }, [popup]);
  async function togglePush() {
    setBusy(true);
    setError("");
    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      )
        throw new Error(
          "Push haipatikani kwenye browser hii. Kwa iPhone, ongeza tovuti kwenye Home Screen kisha ifungue hapo.",
        );
      if (!enabled) {
        const permission = await Notification.requestPermission();
        if (permission !== "granted")
          throw new Error("Ruhusu notifications kwenye mipangilio ya browser ya simu yako.");
      }
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      let sub = await registration.pushManager.getSubscription();
      if (enabled && sub) {
        await careApi({ action: "unsubscribe", subscription: sub.toJSON() });
        await sub.unsubscribe();
        setEnabled(false);
        return;
      }
      const { publicKey } = await careApi({ action: "push-key" });
      const key = Uint8Array.from(atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
        c.charCodeAt(0),
      );
      if (!sub)
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
      await careApi({ action: "subscribe", subscription: sub.toJSON() });
      setEnabled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Arifa hazijawashwa.");
    } finally {
      setBusy(false);
    }
  }
  async function markRead() {
    try {
      await careApi({ action: "read-events", id: events[0]?.id });
      setEvents((prev) => prev.map((e) => ({ ...e, read_at: new Date().toISOString() })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imeshindikana.");
    }
  }
  return (
    <section className="card-soft mb-4 space-y-3 p-4" aria-label="Arifa za admin">
      <div className="flex flex-wrap items-center gap-2">
        <Bell className="size-5 text-primary" />
        <strong>Arifa za admin</strong>
        <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
          Mpya ({events.filter((e) => !e.read_at).length})
        </Button>
        <Button
          size="sm"
          variant={enabled ? "outline" : "default"}
          onClick={() => void togglePush()}
          disabled={busy}
        >
          {enabled ? <BellOff className="mr-1 size-4" /> : <Bell className="mr-1 size-4" />}
          {busy ? "Inahifadhi..." : enabled ? "Zima arifa za simu" : "Washa arifa kwenye simu"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Usajili mpya na ujumbe wa customer care. Ruhusu notifications; iPhone inahitaji tovuti
        kwenye Home Screen. Kila simu inawashwa kivyake.
      </p>
      {error && (
        <p role="alert" className="auth-error text-sm">
          {error}
        </p>
      )}
      {expanded && (
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {events.length ? (
            <>
              <Button size="sm" variant="outline" onClick={() => void markRead()}>
                Weka zote zimesomwa
              </Button>
              {events.map((e) => (
                <div
                  key={e.id}
                  className={`rounded-xl border p-3 text-sm ${e.read_at ? "border-border" : "border-primary bg-primary/5"}`}
                >
                  <p>
                    {e.kind === "registration" ? "Usajili mpya" : "Ujumbe wa customer care"} ·{" "}
                    {e.username || "Akaunti iliyofutwa"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.created_at).toLocaleString()}
                  </p>
                  {e.kind === "support" && (
                    <Button variant="ghost" size="sm" onClick={onOpen}>
                      Fungua customer care
                    </Button>
                  )}
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm">Bado hakuna arifa.</p>
          )}
        </div>
      )}
      {popup && (
        <div
          role="status"
          className="fixed right-4 top-4 z-[120] max-w-[calc(100vw-2rem)] rounded-2xl border border-primary bg-background p-4 shadow-xl"
        >
          <p className="font-bold">
            {popup.kind === "registration"
              ? "Mtumiaji mpya amejisajili"
              : "Ujumbe mpya wa customer care"}
          </p>
          <p className="text-sm">{popup.username}</p>
          <div className="mt-2 flex gap-2">
            {popup.kind === "support" && (
              <Button
                size="sm"
                onClick={() => {
                  onOpen();
                  setPopup(null);
                }}
              >
                Fungua
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setPopup(null)}>
              Funga
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
export function AdminCustomerCare() {
  const [search, setSearch] = useState("");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const result = await careApi({ action: "inbox", search });
      setThreads(result.data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inbox haijapatikana.");
    } finally {
      setLoading(false);
    }
  }, [search]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);
  return (
    <section className="card-soft p-4">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
        <MessageCircle className="size-5 text-primary" />
        Customer care
      </h2>
      <label htmlFor="care-inbox-search" className="mb-2 block text-sm font-semibold">
        Tafuta mazungumzo
      </label>
      <input
        id="care-inbox-search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Username, jina au namba ya simu"
        className="mb-4 w-full rounded-xl border border-border bg-background p-3 text-sm"
      />
      {error && (
        <p role="alert" className="auth-error">
          {error}
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Jaribu tena
          </Button>
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-[minmax(180px,1fr)_2fr]">
        <div
          className={`${selected ? "hidden md:block" : ""} max-h-[65vh] space-y-2 overflow-y-auto`}
        >
          {loading ? (
            <p role="status">Inapakia inbox...</p>
          ) : !threads.length ? (
            <p className="py-8 text-sm text-muted-foreground">
              Mazungumzo yanaonekana hapa mteja akituma ujumbe.
            </p>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                className={`w-full rounded-xl border p-3 text-left transition hover:border-primary ${selected?.id === t.id ? "border-primary bg-primary/10" : "border-border"}`}
                onClick={() => setSelected(t)}
              >
                <span className="font-bold">{t.full_name || t.username}</span>
                {Number(t.unread) > 0 && (
                  <span className="ml-2 rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                    {t.unread}
                  </span>
                )}
                <p className="truncate text-sm text-muted-foreground">
                  {t.kind === "image" ? "Picha" : t.kind === "audio" ? "Voice" : t.body}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
        <div className="min-w-0">
          {selected ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelected(null)}>
                  Rudi inbox
                </Button>
                <strong className="truncate">{selected.username}</strong>
              </div>
              <CustomerCareChat key={selected.id} userId={selected.id} admin />
            </>
          ) : (
            <p className="hidden py-12 text-center text-sm text-muted-foreground md:block">
              Chagua mazungumzo ili kumjibu mteja.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
export function AdminPhoneBans() {
  const [bans, setBans] = useState<{ phone: string; reason: string }[]>([]);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const result = await careApi({ action: "bans" });
      setBans(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Orodha haijapatikana.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function change(action: "ban" | "unban", number = phone) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await careApi({ action, phone: number, reason });
      setNotice(
        action === "ban"
          ? "Namba imezuiwa kujisajili na akaunti zake zimesimamishwa."
          : "Namba imeruhusiwa kujisajili. Akaunti zilizosimamishwa zinawezeshwa tena kupitia Watumiaji.",
      );
      setPhone("");
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Imeshindikana.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card-soft space-y-4 p-4">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <ShieldBan className="size-5" />
        Zuia namba kujisajili
      </h2>
      <p className="text-sm text-muted-foreground">
        Namba ya Tanzania inakubaliwa kama 07…, 06… au +255…. Kwa nchi nyingine, tumia country code.
        Kuzuia namba pia kunasimamisha akaunti zote zenye namba hiyo.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void change("ban");
        }}
        className="space-y-3"
      >
        <label className="block text-sm font-bold" htmlFor="ban-phone">
          Namba ya simu
        </label>
        <input
          id="ban-phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-xl border border-border bg-background p-3"
          placeholder="0712345678"
        />
        <label className="block text-sm font-bold" htmlFor="ban-reason">
          Sababu (hiari)
        </label>
        <input
          id="ban-reason"
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-xl border border-border bg-background p-3"
        />
        <Button variant="destructive" disabled={busy || !phone.trim()} type="submit">
          {busy ? "Inahifadhi..." : "Zuia namba na akaunti zake"}
        </Button>
      </form>
      {error && (
        <p role="alert" className="auth-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="space-y-2">
        {!bans.length ? (
          <p className="text-sm text-muted-foreground">Hakuna namba zilizozuiwa.</p>
        ) : (
          bans.map((b) => (
            <div
              key={b.phone}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
            >
              <div>
                <strong>+{b.phone}</strong>
                <p className="break-words text-sm text-muted-foreground">{b.reason}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void change("unban", b.phone)}
              >
                Ondoa zuio
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
