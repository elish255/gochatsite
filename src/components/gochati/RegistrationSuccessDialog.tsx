import { ArrowRight, PartyPopper, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const confettiColors = ["teal", "gold", "blue", "pink", "green", "violet", "orange", "mint"];

export function RegistrationSuccessDialog({
  open,
  onContinue,
}: {
  open: boolean;
  onContinue: () => void;
}) {
  return (
    <Dialog open={open}>
      <DialogContent
        className="signup-success-dialog [&>button:last-child]:hidden w-[calc(100%-2rem)] max-w-md gap-0 overflow-hidden rounded-[2rem] border-border bg-card p-0 shadow-2xl"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <div className="signup-celebration" aria-hidden="true">
          {confettiColors.map((color, index) => (
            <span key={color} className={`signup-confetti signup-confetti-${index + 1}`} />
          ))}
          <div className="signup-trophy">
            <PartyPopper className="size-9" strokeWidth={1.8} />
          </div>
          <Sparkles className="signup-sparkle signup-sparkle-left size-6" />
          <Sparkles className="signup-sparkle signup-sparkle-right size-5" />
        </div>
        <div className="flex flex-col items-center gap-4 px-6 pb-7 text-center sm:px-8">
          <DialogTitle className="max-w-xs text-2xl font-black leading-tight tracking-tight sm:text-[1.75rem]">
            HONGERA USAJILI WAKO UMEKAMILIKA
          </DialogTitle>
          <DialogDescription className="max-w-xs text-base leading-7">
            Akaunti yako imetengenezwa kikamilifu. Sasa unaweza kuanza mazungumzo na kupata malipo.
          </DialogDescription>
          <p className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-extrabold tracking-wide text-primary">
            ANZA KUCHATI NA ULIPWE SASA
          </p>
          <Button
            variant="reference"
            size="reference"
            className="mt-2 min-h-12 w-full justify-center gap-2 rounded-2xl text-base font-extrabold"
            onClick={onContinue}
            autoFocus
          >
            ENDELEA
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
