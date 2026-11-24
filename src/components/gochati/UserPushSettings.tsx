import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { careApi } from "./customer-care-api";

export function UserPushSettings() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistration("/")
        .then((registration) => registration?.pushManager.getSubscription())
        .then((subscription) => {
          if (active) setEnabled(Boolean(subscription));
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []);

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        throw new Error("Push haipatikani kwenye browser hii.");
      }
      if (enabled) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await careApi({ action: "unsubscribe", subscription: subscription.toJSON() });
          await subscription.unsubscribe();
        }
        setEnabled(false);
        return;
      }
      if (
        Notification.permission !== "granted" &&
        (await Notification.requestPermission()) !== "granted"
      ) {
        throw new Error("Ruhusu notifications kwenye mipangilio ya browser yako.");
      }
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      const { publicKey } = await careApi({ action: "push-key" });
      const applicationServerKey = Uint8Array.from(
        atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")),
        (character) => character.charCodeAt(0),
      );
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      await careApi({ action: "subscribe", subscription: subscription.toJSON() });
      setEnabled(true);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Imeshindikana kubadilisha mipangilio ya push.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
      <Button
        type="button"
        size="sm"
        variant={enabled ? "outline" : "default"}
        disabled={busy}
        onClick={() => void toggle()}
      >
        {enabled ? <BellOff className="mr-2 size-4" /> : <Bell className="mr-2 size-4" />}
        {busy ? "Inahifadhi..." : enabled ? "Zima matangazo ya push" : "Pokea matangazo ya push"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
