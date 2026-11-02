import { useState } from "react";
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
            ? "gochat-float fixed bottom-5 right-5 z-50 overflow-hidden rounded-full border-2 border-primary shadow-lg"
            : ""
        }
      >
        {floating ? (
          <img
            src={support}
            alt="Msaidizi wa Gochati"
            width={56}
            height={56}
            className="size-14 object-cover"
          />
        ) : (
          "Customer services"
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
