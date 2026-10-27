import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import support from "@/assets/support.jpg";

export function SupportButton({ floating = false }: { floating?: boolean }) {
  const [open, setOpen] = useState(false);
  const [registration, setRegistration] = useState<"yes" | "no" | null>(null);
  return (
    <>
      <Button
        variant={floating ? "reference" : "outline"}
        onClick={() => {
          setRegistration(null);
          setOpen(true);
        }}
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
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogTitle>
            {registration === null
              ? "UMEJISAJILI?"
              : registration === "yes"
                ? "Wasiliana nasi kwa Msaada Zaidi"
                : "Jisajili Kwanza"}
          </DialogTitle>
          <DialogDescription>
            {registration === null
              ? "Chagua jibu ili kuendelea na huduma kwa wateja."
              : registration === "yes"
                ? "Tuma meseji kwa huduma kwa wateja kwa SMS."
                : "Jisajili kwanza ili kuendelea na huduma kwa wateja."}
          </DialogDescription>
          {registration === null ? (
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => setRegistration("yes")}>NDIO</Button>
              <Button variant="outline" onClick={() => setRegistration("no")}>
                HAPANA
              </Button>
            </div>
          ) : registration === "yes" ? (
            <Button asChild>
              <a href="sms:0743871339?body=Nielekeze%20kuhusu%20Gochat">Tuma SMS</a>
            </Button>
          ) : (
            <Button asChild>
              <a href="/register">Gusa hapa Kujisajili Kwanza</a>
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
