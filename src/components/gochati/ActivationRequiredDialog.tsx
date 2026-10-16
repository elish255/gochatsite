import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function ActivationRequiredDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogTitle>Akaunti yako haijawa hai</DialogTitle>
        <DialogDescription>
          Huduma hii inahitaji akaunti iliyo hai (active account). Ada ya activation ni TZS 16,000.
          Kulipa ada hakuwezeshi kutoa salio kama pesa halisi.
        </DialogDescription>
        <Button asChild><a href="/register">Fungua na Activate Akaunti Hapa</a></Button>
        <Button variant="outline" onClick={onClose}>Funga</Button>
      </DialogContent>
    </Dialog>
  );
}
