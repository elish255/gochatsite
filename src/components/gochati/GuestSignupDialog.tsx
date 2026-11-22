import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LockKeyhole } from "lucide-react";

export function GuestSignupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] rounded-3xl border-primary/30 bg-card p-6 sm:max-w-sm">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="grad-brand flex size-14 items-center justify-center rounded-2xl text-on-color shadow-lg">
            <LockKeyhole className="size-6" aria-hidden="true" />
          </div>
          <DialogTitle className="pt-2 text-balance text-xl font-black">
            Umefikia meseji 2 za majaribio
          </DialogTitle>
          <DialogDescription className="text-pretty text-sm leading-relaxed">
            Jisajili bila malipo ili uendelee kuchat na wageni. Kama tayari una akaunti, ingia kuendelea.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <a
            href="/register"
            className="grad-brand flex w-full items-center justify-center rounded-full px-5 py-3.5 text-sm font-extrabold text-on-color shadow-lg transition active:scale-95"
          >
            JISAJILI SASA
          </a>
          <a
            href="/login"
            className="flex w-full items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-bold text-foreground transition hover:bg-muted"
          >
            Tayari una akaunti? Ingia
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
