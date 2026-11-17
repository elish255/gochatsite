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

type Balloon = {
  offsetX: number;
  offsetY: number;
  size: number;
  rotate: number;
  color: string;
  string: number;
};

const LEFT_BALLOONS: Balloon[] = [
  { offsetX: 0, offsetY: 18, size: 40, rotate: -14, color: "bg-primary", string: 56 },
  { offsetX: 26, offsetY: 0, size: 46, rotate: -4, color: "bg-destructive", string: 70 },
  { offsetX: 8, offsetY: 52, size: 32, rotate: -20, color: "bg-chart-4", string: 44 },
];

const RIGHT_BALLOONS: Balloon[] = [
  { offsetX: 0, offsetY: 16, size: 42, rotate: 14, color: "bg-chart-2", string: 58 },
  { offsetX: 28, offsetY: 0, size: 36, rotate: 6, color: "bg-primary", string: 66 },
  { offsetX: 6, offsetY: 54, size: 30, rotate: 22, color: "bg-destructive", string: 40 },
];

function BalloonCluster({ side, balloons }: { side: "left" | "right"; balloons: Balloon[] }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -top-14 h-32 w-24 ${
        side === "left" ? "-left-10" : "-right-10"
      }`}
    >
      {balloons.map((balloon, index) => (
        <div
          key={index}
          className="absolute flex flex-col items-center"
          style={{
            top: balloon.offsetY,
            [side]: balloon.offsetX,
            transform: `rotate(${balloon.rotate}deg)`,
            transformOrigin: "bottom center",
          }}
        >
          <div
            className={`${balloon.color} relative shadow-lg ring-1 ring-background/20`}
            style={{
              width: balloon.size,
              height: balloon.size * 1.2,
              borderRadius: "50% 50% 48% 48% / 55% 55% 45% 45%",
            }}
          >
            <span className="absolute left-1/4 top-1/5 h-1/4 w-1/5 rounded-full bg-background/50" />
          </div>
          <div className={`${balloon.color} h-1.5 w-2 [clip-path:polygon(50%_0,100%_100%,0_100%)]`} />
          <div className="w-px bg-muted-foreground/60" style={{ height: balloon.string }} />
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
      <DialogContent className="max-w-[calc(100%-5rem)] overflow-visible border-2 border-primary/40 pt-8 sm:max-w-sm">
        <BalloonCluster side="left" balloons={LEFT_BALLOONS} />
        <BalloonCluster side="right" balloons={RIGHT_BALLOONS} />
        <DialogHeader className="relative gap-3 text-center sm:text-center">
          <span className="mx-auto rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            Hongera Sana!
          </span>
          <DialogTitle className="text-balance text-2xl font-extrabold leading-tight">
            Kiwango cha kutoa pesa <span className="text-primary">kimefikiwa</span>
          </DialogTitle>
          <DialogDescription className="text-pretty text-base leading-relaxed text-foreground">
            <strong className="font-bold text-primary">Umefikia Kiwango Cha kutoa Pesa</strong>,{" "}
            Ungana na <strong className="font-bold">Watanzania Wengine</strong> Kunufaika na{" "}
            <strong className="font-bold underline decoration-primary decoration-2 underline-offset-4">
              Hii Fursa
            </strong>{" "}
            Gusa <strong className="font-extrabold text-primary">Upgrade</strong> ili kupokea{" "}
            <strong className="font-bold">Withdrawal Yako</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="relative flex justify-center pt-1">
          <Button asChild size="lg" className="w-full text-base font-bold">
            <a href="/withdrawal">Upgrade</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
