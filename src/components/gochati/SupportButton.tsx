import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { platform } from "@/integrations/netlify/client";
import { CustomerCareChat } from "./CustomerCareChat";
import { careApi } from "./customer-care-api";
import support from "@/assets/support.jpg";

export function SupportButton({ floating = false }: { floating?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"loading" | "chat" | "sms" | "error">("loading");
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);
  const statusRequest = useRef(0);
  useEffect(() => {
    let alive = true;
    async function refresh() {
      const request = ++statusRequest.current;
      try {
        const {
          data: { user },
        } = await platform.auth.getUser();
        const status = user ? await careApi({ action: "status" }) : { unread: 0 };
        if (alive && request === statusRequest.current) setUnread(Number(status.unread || 0));
      } catch {
        /* Keep the last known badge during a temporary network failure. */
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    window.addEventListener("focus", refresh);
    const onRead = () => {
      setUnread(0);
      void refresh();
    };
    window.addEventListener("care-messages-read", onRead);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("care-messages-read", onRead);
    };
  }, []);
  async function check() {
    setOpen(true);
    setMode("loading");
    setError("");
    try {
      const {
        data: { user },
      } = await platform.auth.getUser();
      if (!user) {
        setMode("sms");
        return;
      }
      const status = await careApi({ action: "status" });
      setMode(status.active ? "chat" : "sms");
    } catch (err) {
      setMode("error");
      setError(err instanceof Error ? err.message : "Huduma haipatikani. Jaribu tena.");
    }
  }
  return (
    <>
      <Button
        variant={floating ? "reference" : "outline"}
        onClick={() => void check()}
        aria-label="Customer services"
        className={
          floating
            ? "gochat-float fixed bottom-5 right-5 z-50 rounded-full border-2 border-primary shadow-lg"
            : "relative"
        }
      >
        {floating ? (
          <img
            src={support}
            alt="Msaidizi wa Gochati"
            width={56}
            height={56}
            className="size-14 rounded-full object-cover"
          />
        ) : (
          "Customer services"
        )}
        {unread > 0 && (
          <span
            aria-label={`${unread} ujumbe mpya`}
            className="absolute -right-1 -top-2 min-w-5 rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground"
          >
            {unread}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[95dvh] max-w-lg overflow-y-auto rounded-3xl">
          <DialogTitle>Customer care</DialogTitle>
          <DialogDescription>
            {mode === "chat"
              ? "Wasiliana na admin ndani ya akaunti yako."
              : "Huduma kwa wateja ya Gochati."}
          </DialogDescription>
          {mode === "loading" ? (
            <p role="status">Inakagua akaunti...</p>
          ) : mode === "chat" ? (
            <CustomerCareChat />
          ) : mode === "error" ? (
            <>
              <p role="alert">{error}</p>
              <Button onClick={() => void check()}>Jaribu tena</Button>
              <Button variant="outline" asChild>
                <a href="sms:0743871339?body=Nielekeze%20kuhusu%20Gochat">Tuma SMS</a>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Chat ndani ya tovuti inapatikana kwa akaunti active. Wasiliana nasi kwa SMS kwenye
                0743871339.
              </p>
              <Button asChild>
                <a href="sms:0743871339?body=Nielekeze%20kuhusu%20Gochat">Tuma SMS</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/login">Ingia kwenye akaunti</a>
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
