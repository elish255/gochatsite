import { useEffect } from "react";
import { platform } from "@/integrations/supabase/platform";

export function PresenceTracker() {
  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    const recordPresence = async () => {
      if (disposed || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const { data } = await platform.auth.getSession();
        const headers = new Headers();
        if (data.session?.access_token) {
          headers.set("Authorization", `Bearer ${data.session.access_token}`);
        }
        await fetch("/api/gochati-presence", {
          method: "POST",
          headers,
          credentials: "same-origin",
          keepalive: true,
        });
      } catch {
        // Presence is best-effort and must not interrupt the app.
      } finally {
        inFlight = false;
      }
    };
    const timer = window.setInterval(() => void recordPresence(), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void recordPresence();
    };
    document.addEventListener("visibilitychange", onVisible);
    void recordPresence();
    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
