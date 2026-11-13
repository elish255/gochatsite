import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type WithdrawalUpgradeReminderProps = {
  eligible: boolean;
};

const REMINDER_INTERVAL_MS = 2 * 60 * 1000;

export function WithdrawalUpgradeReminder({ eligible }: WithdrawalUpgradeReminderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (eligible) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [eligible]);

  useEffect(() => {
    if (!eligible || open) return;

    const timeout = window.setTimeout(() => setOpen(true), REMINDER_INTERVAL_MS);
    return () => window.clearTimeout(timeout);
  }, [eligible, open]);

  if (!eligible) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="gap-3 pr-7 text-left">
          <DialogTitle className="text-lg leading-snug">
            Kiwango cha kutoa pesa kimefikiwa
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-foreground">
            Umefikia Kiwango Cha kutoa Pesa, Gusa Toa Pesa Weka kiasi Kisha Kamilisha Malipo ya
            Upgrade ili kupokea Withdrawal Yako
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-1">
          <Button asChild className="w-full">
            <a href="/withdrawal">Upgrade</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
