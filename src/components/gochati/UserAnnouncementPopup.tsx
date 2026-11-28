import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AnnouncementNotification = {
  id: string;
  title?: string | null;
  message: string;
  payment_amount?: number | string | null;
};

type Props = {
  notification: AnnouncementNotification | null;
  onDismiss: (id: string) => Promise<void>;
};

function formatTzs(amount: number) {
  return `TZS ${amount.toLocaleString("en-US")}`;
}

export function UserAnnouncementPopup({ notification, onDismiss }: Props) {
  if (!notification) return null;
  const currentNotification = notification;

  const paymentAmount = Number(currentNotification.payment_amount);
  const hasPaymentAction = Number.isInteger(paymentAmount) && paymentAmount >= 100;

  async function dismiss() {
    await onDismiss(currentNotification.id);
  }

  async function openVipPayment() {
    await dismiss();
    window.location.assign("/payment?type=vip");
  }

  return (
    <Dialog open onOpenChange={(open) => !open && void dismiss()}>
      <DialogContent className="border-primary/30 bg-card text-card-foreground sm:max-w-md">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle className="text-xl font-bold">
            {notification.title || "Tangazo la GOCHATI"}
          </DialogTitle>
          <DialogDescription className="whitespace-pre-wrap pt-2 text-base leading-relaxed text-foreground">
            {notification.message}
          </DialogDescription>
        </DialogHeader>
        {hasPaymentAction && (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
            <p className="text-sm text-muted-foreground">Bei yako ya VIP</p>
            <p className="mt-1 text-xl font-bold">{formatTzs(paymentAmount)}</p>
          </div>
        )}
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-2">
          <Button variant="outline" onClick={() => void dismiss()}>
            Funga
          </Button>
          {hasPaymentAction && (
            <Button onClick={() => void openVipPayment()}>
              Lipa sasa — {formatTzs(paymentAmount)}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
