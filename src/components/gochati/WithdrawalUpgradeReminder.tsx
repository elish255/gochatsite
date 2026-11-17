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

const REMINDER_INTERVAL_MS = 5 * 60 * 1000;

const BALLOONS = [
  { left: "6%", size: 34, delay: 0, duration: 4.2, color: "bg-primary" },
  { left: "20%", size: 26, delay: 0.6, duration: 3.6, color: "bg-destructive" },
  { left: "36%", size: 30, delay: 0.2, duration: 4.6, color: "bg-chart-4" },
  { left: "54%", size: 24, delay: 0.9, duration: 3.8, color: "bg-chart-2" },
  { left: "70%", size: 32, delay: 0.4, duration: 4.4, color: "bg-primary" },
  { left: "86%", size: 28, delay: 1.1, duration: 3.9, color: "bg-destructive" },
];

function CelebrationBalloons() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
      <style>{`
        @keyframes gochati-balloon-rise {
          0% { transform: translateY(0) translateX(0) rotate(-4deg); opacity: 0; }
          10% { opacity: 0.95; }
          50% { transform: translateY(-55vh) translateX(10px) rotate(4deg); }
          90% { opacity: 0.95; }
          100% { transform: translateY(-110vh) translateX(-8px) rotate(-3deg); opacity: 0; }
        }
        .gochati-balloon { animation: gochati-balloon-rise linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gochati-balloon { animation: none; opacity: 0; }
        }
      `}</style>
      {BALLOONS.map((balloon, index) => (
        <div
          key={index}
          className="gochati-balloon absolute bottom-0 flex flex-col items-center opacity-0"
          style={{
            left: balloon.left,
            animationDelay: `${balloon.delay}s`,
            animationDuration: `${balloon.duration}s`,
          }}
        >
          <div
            className={`${balloon.color} relative rounded-full shadow-md`}
            style={{
              width: balloon.size,
              height: balloon.size * 1.2,
              borderRadius: "50% 50% 48% 48% / 55% 55% 45% 45%",
            }}
          >
            <span className="absolute left-1/4 top-1/5 h-1/4 w-1/5 rounded-full bg-background/50" />
          </div>
          <div className="h-10 w-px bg-muted-foreground/50" />
        </div>
      ))}
    </div>
  );
}

export function WithdrawalUpgradeReminder({ eligible }: WithdrawalUpgradeReminderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(eligible);
  }, [eligible]);

  useEffect(() => {
    if (!eligible || open) return;

    const timeout = window.setTimeout(() => setOpen(true), REMINDER_INTERVAL_MS);
    return () => window.clearTimeout(timeout);
  }, [eligible, open]);

  if (!eligible) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm overflow-hidden">
        <CelebrationBalloons />
        <DialogHeader className="relative gap-3 pr-7 text-left">
          <DialogTitle className="text-lg leading-snug">
            Hongera! Kiwango cha kutoa pesa kimefikiwa
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-foreground">
            Umefikia Kiwango Cha kutoa Pesa, Ungana na Watanzania Wengine Kunufaika na Hii Fursa
            Gusa Upgrade ili kupokea Withdrawal Yako
          </DialogDescription>
        </DialogHeader>
        <div className="relative flex justify-center pt-1">
          <Button asChild className="w-full">
            <a href="/withdrawal">Upgrade</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
