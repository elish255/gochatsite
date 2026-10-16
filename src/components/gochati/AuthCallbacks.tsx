import { useEffect, useState, type FormEvent } from "react";
import {
  acceptInvite,
  handleAuthCallback,
  requestPasswordRecovery,
  updateUser,
} from "@netlify/identity";
import { Button } from "@/components/ui/button";

export function AuthCallbacks() {
  const [action, setAction] = useState<"invite" | "recovery" | null>(null);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void handleAuthCallback()
      .then((result) => {
        if (result?.type === "invite") {
          setToken(result.token || "");
          setAction("invite");
        } else if (result?.type === "recovery") setAction("recovery");
        else if (result)
          setNotice("Email imethibitishwa. Unaweza kuendelea kwenye akaunti yako au /admin.");
      })
      .catch(() => setNotice("Kiungo hakifanyi kazi au kimeisha muda. Omba kiungo kipya."));
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (action === "invite") await acceptInvite(token, password);
      else await updateUser({ password });
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
        <a href="/payment" className="underline">
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
  const [email, setEmail] = useState("");
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
        try {
          await requestPasswordRecovery(email.trim().toLowerCase());
          setNotice("Kama email imesajiliwa, angalia inbox kwa kiungo cha kurejesha password.");
        } catch {
          setNotice("Ombi halijatumwa. Jaribu tena.");
        } finally {
          setBusy(false);
        }
      }}
      className="mt-4"
    >
      <p className="text-sm text-muted-foreground">
        Weka email ya usajili. Utapokea kiungo cha kuweka password mpya.
      </p>
      <label className="auth-field">
        <span>Email ya kurejesha password</span>
        <div className="auth-input">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </label>
      <Button type="submit" disabled={busy}>
        {busy ? "Inatuma..." : "Tuma kiungo cha password mpya"}
      </Button>
      <Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
        Ghairi
      </Button>
      {notice && <p role="status">{notice}</p>}
    </form>
  );
}
