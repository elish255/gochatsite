import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Mode = "register" | "login" | "forgot" | "reset";
const countries = ["Tanzania", "Kenya", "Uganda", "Rwanda", "Burundi", "South Sudan", "Democratic Republic of the Congo", "Somalia"];

export function AuthPage({ mode }: { mode: Mode }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const register = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      if (register) {
        if (password !== String(form.get("repeat_password") ?? "")) throw new Error("Password na Repeat Password hazifanani.");
        const username = value("username").toLowerCase();
        if (!/^[a-z0-9_]{3,30}$/.test(username)) throw new Error("Username iwe na herufi, namba au _ (herufi 3–30).");
        const email = value("email").toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Weka email halali, mfano jina@gmail.com.");
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: value("email").toLowerCase(), password,
          options: { data: { full_name: value("full_name"), username, phone: value("phone"), country: value("country") } },
        });
        if (signUpError) {
          const detail = [signUpError.message, signUpError.code ? `Code: ${signUpError.code}` : ""].filter(Boolean).join(" — ");
          if (/500|database error|trigger|duplicate key|gochati_users/i.test(detail)) {
            throw new Error(`Usajili umeshindwa kuhifadhi taarifa kwenye database. Kama kosa linaendelea, endesha SQL ya kurekebisha usajili kwenye Supabase SQL Editor. Maelezo: ${detail}`);
          }
          throw new Error(detail);
        }
        if (!data.session) {
          setMessage("Akaunti imetengenezwa lakini Supabase inahitaji uthibitisho wa email. Angalia inbox yako, au zima Confirm email kwenye Supabase Auth ili kuendelea moja kwa moja.");
          return;
        }
        await navigate({ to: "/payment", replace: true });
      } else if (mode === "login") {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email: value("username"), password });
        if (loginError) throw new Error("Username au password si sahihi.");
        await navigate({ to: "/payment", replace: true });
      } else if (mode === "forgot") {
        throw new Error("Wasiliana na huduma kwa wateja ili kusaidiwa kurejesha password ya akaunti ya username.");
      } else {
        throw new Error("Fungua kiungo halali cha kurejesha password kwanza.");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Imeshindikana. Jaribu tena."); }
    finally { setBusy(false); }
  }

  return <main className="auth-page auth-register"><section className="auth-content">
    <img src="/gochat/logo.png" alt="Gochati" width={88} height={88} className="mx-auto mb-4 rounded-2xl object-contain" />
    <h1>{register ? "Fungua Akaunti" : mode === "login" ? "Ingia kwenye Akaunti" : "Rejesha Password"}</h1>
    <p className="auth-subtitle">{register ? "Jaza taarifa zako kisha endelea kwenye ukurasa wa malipo." : "Tumia email na password ulizotumia wakati wa usajili."}</p>
    <form onSubmit={submit}>
      {register && <>
        <label className="auth-field"><span>Full name</span><div className="auth-input"><input name="full_name" placeholder="Majina yako kamili" autoComplete="name" required /></div></label>
        <label className="auth-field"><span>Email</span><div className="auth-input"><input name="email" type="email" placeholder="jina@gmail.com" autoComplete="email" required /></div></label>
        <label className="auth-field"><span>Username</span><div className="auth-input"><input name="username" placeholder="Chagua username" autoComplete="username" minLength={3} maxLength={30} required /></div></label>
        <label className="auth-field"><span>Phone number</span><div className="auth-input"><input name="phone" placeholder="0712345678" type="tel" autoComplete="tel" pattern="[+]?[0-9 ]{9,16}" required /></div></label>
        <label className="auth-field"><span>Choose Country</span><div className="auth-input"><select name="country" defaultValue="" required><option value="" disabled>Chagua nchi</option>{countries.map(country => <option key={country} value={country}>{country}</option>)}</select></div></label>
      </>}
      {!register && <label className="auth-field"><span>Email</span><div className="auth-input"><input name="username" type="email" autoComplete="email" placeholder="Email uliyosajili" required /></div></label>}
      {mode !== "forgot" && <>
        <label className="auth-field"><span>Password</span><div className="auth-input"><input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={8} placeholder="Password (angalau herufi 8)" required /></div></label>
        {register && <label className="auth-field"><span>Repeat password</span><div className="auth-input"><input name="repeat_password" type="password" autoComplete="new-password" minLength={8} placeholder="Rudia password" required /></div></label>}
      </>}
      {error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-message" role="status">{message}</p>}
      <Button variant="reference" type="submit" disabled={busy} className="auth-submit">{busy ? "Subiri..." : register ? "JISAJILI" : "INGIA"}</Button>
    </form>
    <p className="auth-footer">{register ? <>Una akaunti tayari? <Button asChild variant="reference"><Link to="/login">Ingia hapa</Link></Button></> : <>Huna akaunti? <Button asChild variant="reference"><Link to="/register">Jisajili hapa</Link></Button></>}</p>
  </section></main>;
}
