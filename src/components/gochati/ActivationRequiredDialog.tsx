import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function ActivationRequiredDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogTitle>Akaunti yako haijawa hai</DialogTitle>
        <DialogDescription>
          Huduma hii inahitaji akaunti iliyo hai (active account). Jisajili sasa na lipia ada ya activation ya TZS 16,000 ili kutumia huduma ya mazungumzo. Salio na withdrawal ni mfano wa matumizi ya mfumo.
        </DialogDescription>
        <Button asChild><a href="/register">Fungua na Activate Akaunti Hapa</a></Button>
        <Button variant="outline" onClick={onClose}>Funga</Button>
      </DialogContent>
    </Dialog>
  );
}
