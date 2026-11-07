import { Button } from "@/components/ui/button";
import { ArrowRight, TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function ActivationRequiredDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] gap-5 overflow-y-auto rounded-[2rem] border-border bg-card p-6 sm:max-w-md sm:rounded-[2rem] sm:p-7">
        <div className="mb-1 flex size-16 items-center justify-center rounded-full border border-destructive/25 bg-destructive/10 text-destructive">
          <TriangleAlert className="size-8" aria-hidden="true" />
        </div>
        <DialogTitle className="text-sm font-bold tracking-[0.2em] text-destructive">JISAJILI ILI KUENDELEA</DialogTitle>
        <DialogDescription asChild>
          <div className="space-y-4 text-base leading-7">
            <p className="text-foreground">Jisajili sasa kuweza kuendelea kuchat na kulipwa.</p>
            <p>Akaunti yako inakuwa active moja kwa moja baada ya kujisajili.</p>
          </div>
        </DialogDescription>
        <Button variant="reference" size="reference" asChild>
          <a href="/register" className="grad-brand mt-2 flex items-center justify-between gap-4 rounded-[2rem] px-6 py-5 text-on-color shadow-lg">
            <span>
              <span className="block text-base font-extrabold tracking-widest">JISAJILI SASA</span>
              <span className="mt-1 block text-xs opacity-80">Endelea kwenye fomu ya usajili</span>
            </span>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-on-color/15"><ArrowRight className="size-5" aria-hidden="true" /></span>
          </a>
        </Button>
        <Button variant="outline" size="reference" asChild className="w-full rounded-[2rem] px-6 py-5">
          <a href="/login" className="flex items-center justify-center gap-2">
            <span className="text-base font-extrabold">INGIA HAPA</span>
          </a>
        </Button>
        <Button variant="reference" size="reference" className="py-1 text-sm text-muted-foreground" onClick={onClose}>Rudi nyuma</Button>
      </DialogContent>
    </Dialog>
  );
}
