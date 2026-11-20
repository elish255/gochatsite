import { ArrowRight, Check, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const ACTIVATION_FEE = "TSh 16,000";

const benefits = [
  "Uendelee kuchat na wageni bila kikomo kwa kuwafundisha Kiswahili.",
  "Uanze kulipwa kwa kila mazungumzo unayofanya.",
  "Upate huduma zote za GOCHATI.",
];

export function ActivationRequiredDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] gap-0 overflow-y-auto rounded-[2rem] border-primary/30 bg-card p-6 text-center sm:max-w-sm sm:p-7">
        <div className="grad-brand mx-auto flex size-16 items-center justify-center rounded-2xl text-on-color shadow-lg">
          <Lock className="size-7" aria-hidden="true" />
        </div>
        <DialogTitle className="mt-5 text-balance text-2xl font-black leading-tight">
          Endelea Kuchat <span className="block text-primary">na Kulipwa</span>
        </DialogTitle>
        <DialogDescription className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
          Umefikia mwisho wa mazungumzo ya bure. Lipia Activation Fee ya{" "}
          <strong className="font-bold text-foreground">{ACTIVATION_FEE} Tu</strong> ili:
        </DialogDescription>
        <ul className="mt-5 flex flex-col gap-3 text-left text-sm leading-relaxed">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Check className="size-3.5" aria-hidden="true" />
              </span>
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        <a
          href="/payment?type=activation"
          className="grad-brand mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-extrabold tracking-widest text-on-color shadow-lg transition active:scale-95"
        >
          LIPIA SASA <ArrowRight className="size-4" aria-hidden="true" />
        </a>
        <button type="button" onClick={onClose} className="mt-3 py-1 text-sm text-muted-foreground">
          Funga
        </button>
      </DialogContent>
    </Dialog>
  );
}
