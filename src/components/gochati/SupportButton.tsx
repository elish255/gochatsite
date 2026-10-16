import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import support from "@/assets/support.jpg";

export function SupportButton({ floating = false }: { floating?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={floating ? "reference" : "outline"}
        onClick={() => setOpen(true)}
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
          <DialogTitle>Wasiliana nasi kwa Msaada Zaidi</DialogTitle>
          <DialogDescription>Nielekeze kuhusu Gochat</DialogDescription>
          <Button asChild>
            <a href="sms:0743871339?body=Nielekeze%20kuhusu%20Gochat">Tuma SMS</a>
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://wa.me/255770490075?text=Nielekeze%20kuhusu%20Gochat"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
