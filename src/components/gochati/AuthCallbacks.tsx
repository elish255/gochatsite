import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AuthCallbacks() {
  const [action, setAction] = useState<"recovery" | null>(null);
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const type = params.get("type") || hash.get("type");
    if (type === "recovery" || type === "invite") {
      setAction("recovery");
      return;
    }
    if (window.location.search.includes("code=")) {
      void supabase.auth.exchangeCodeForSession(params.get("code")!).then(({ error }) => {
        if (error) setNotice("Kiungo hakifanyi kazi au kimeisha muda. Omba kiungo kipya.");
        else setNotice("Email imethibitishwa. Unaweza kuendelea kwenye akaunti yako.");
      });
    }
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      window.location.href = "/login";
    } catch {
      setNotice("Password haijahifadhiwa. Jaribu tena au omba kiungo kipya.");
    } finally {
      setBusy(false);
    }
  }
  if (!action)
    return notice ? (
      <div role="status" className="border-b border-border bg-card p-4 text-center text-sm">
        {notice}{" "}
        <a href="/" className="underline">
          Endelea
        </a>
      </div>
    ) : null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-5">
      <form
        onSubmit={save}
        className="w-full max-w-md rounded-2xl bg-background p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Weka password"
      >
        <h2 className="text-xl font-bold">Weka password yako</h2>
        <label className="auth-field">
          <span>Password mpya</span>
          <div className="auth-input">
            <input
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </label>
        <Button type="submit" disabled={busy}>
          Hifadhi password
        </Button>
        {notice && <p role="alert">{notice}</p>}
      </form>
    </div>
  );
}
export function PasswordHelp() {
  const [phone, setPhone] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        Forgot password? / Umesahau password?
      </Button>
    );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setNotice("");
        try {
          const response = await fetch("/api/gochati-sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reset_password", phone: phone.trim() }),
          });
          const result = (await response.json().catch(() => ({}))) as { message?: string };
          if (!response.ok) throw new Error(result.message || "Ombi halijatumwa. Jaribu tena.");
          setNotice(
            "Kama namba hii imesajiliwa, utapokea SMS kutoka GOCHATI yenye password mpya. Itumie kuingia na username yako.",
          );
        } catch (cause) {
          setNotice(cause instanceof Error ? cause.message : "Ombi halijatumwa. Jaribu tena.");
        } finally {
          setBusy(false);
        }
      }}
      className="mt-4"
    >
      <p className="text-sm text-muted-foreground">
        Weka namba ya simu uliyojisajili nayo. Utapokea SMS kutoka GOCHATI yenye password mpya.
      </p>
      <label className="auth-field">
        <span>Namba ya simu</span>
        <div className="auth-input">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0712345678"
            pattern="[+]?[0-9 ]{9,16}"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </label>
      <Button type="submit" disabled={busy}>
        {busy ? "Inatuma..." : "Tuma password mpya kwa SMS"}
      </Button>
      <Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
        Ghairi
      </Button>
      {notice && <p role="status">{notice}</p>}
    </form>
  );
}
