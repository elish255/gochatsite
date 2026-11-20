import { useCallback, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SupportButton } from "./SupportButton";

const EXEMPT_PATHS = ["/admin"];

export function AccountBlockGuard() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [blocked, setBlocked] = useState(false);

  const check = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      setBlocked(false);
      return;
    }
    const { data } = await supabase
      .from("gochati_users")
      .select("payment_blocked")
      .eq("id", session.user.id)
      .maybeSingle();
    setBlocked(Boolean(data?.payment_blocked));
  }, []);

  useEffect(() => {
    void check();
  }, [check, pathname]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      void check();
    });
    const timer = setInterval(() => void check(), 30000);
    window.addEventListener("focus", check);
    return () => {
      data.subscription.unsubscribe();
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [check]);

  if (!blocked || EXEMPT_PATHS.some((p) => pathname.startsWith(p))) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/95 p-5 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="account-blocked-title"
        aria-describedby="account-blocked-desc"
        className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl border border-destructive/40 bg-card p-6 text-center shadow-xl"
      >
        <h2 id="account-blocked-title" className="text-2xl font-extrabold text-destructive">
          AKAUNTI IMEZUIWA
        </h2>
        <p
          id="account-blocked-desc"
          className="text-base font-semibold leading-relaxed text-destructive text-pretty"
        >
          Account yako imezuiwa, Mtafute mtoa huduma kwa Msaada.
        </p>
        <SupportButton />
      </div>
    </div>
  );
}
