import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SupportProfile = {
  username: string | null;
  full_name: string | null;
  country: string | null;
  account_status: string | null;
  activation_paid: boolean | null;
  vip_tax_paid: boolean | null;
  is_premium: boolean | null;
  is_vip: boolean | null;
  balance: number | string | null;
  created_at: string | null;
};

type SupportWithdrawal = {
  id: string;
  amount: number | string;
  net_amount: number | string;
  status: string;
  created_at: string;
};

type SupportData = {
  profile: SupportProfile;
  withdrawals: SupportWithdrawal[];
};

type AdminSupportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { username?: string | null; full_name?: string | null } | null;
  data: SupportData | null;
  loading: boolean;
  error: string;
};

function formatMoney(value: number | string | null) {
  return `TZS ${Number(value ?? 0).toLocaleString("sw-TZ")}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("sw-TZ");
}

export function AdminSupportDialog({
  open,
  onOpenChange,
  user,
  data,
  loading,
  error,
}: AdminSupportDialogProps) {
  const profile = data?.profile;
  const plan = profile?.is_vip ? "VIP" : profile?.is_premium ? "Premium" : "Normal";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dashibodi ya mtumiaji</DialogTitle>
          <DialogDescription>
            {user?.username || user?.full_name || "Mtumiaji"} · Support view
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTitle>Support view — kusoma tu</AlertTitle>
          <AlertDescription>
            Ufikiaji huu unawekwa kwenye kumbukumbu ya Admin. Huwezi kubadilisha akaunti au kuomba withdrawal hapa.
          </AlertDescription>
        </Alert>

        {loading && (
          <p className="py-6 text-center text-sm text-muted-foreground" role="status">
            Inapakia dashboard...
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        {profile && !loading && (
          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader>
                <CardTitle>{profile.full_name || profile.username || "Mtumiaji"}</CardTitle>
                <CardDescription>
                  {profile.username ? `@${profile.username}` : "Mtumiaji"} · {profile.country || "—"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Salio</dt>
                    <dd className="mt-1 font-semibold">{formatMoney(profile.balance)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Mpango</dt>
                    <dd className="mt-1">
                      <Badge variant={profile.is_vip || profile.is_premium ? "default" : "secondary"}>
                        {plan}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Hali ya akaunti</dt>
                    <dd className="mt-1 font-medium">{profile.account_status || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tax Paid</dt>
                    <dd className="mt-1 font-medium">{profile.vip_tax_paid ? "Imelipwa" : "Haijawekwa"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Activation</dt>
                    <dd className="mt-1 font-medium">{profile.activation_paid ? "Imelipwa" : "Haijalipwa"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Amejiunga</dt>
                    <dd className="mt-1 font-medium">{formatDate(profile.created_at)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <section aria-labelledby="support-withdrawals-title">
              <h3 id="support-withdrawals-title" className="mb-3 font-semibold">
                Withdrawal za karibuni
              </h3>
              {data.withdrawals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Hakuna withdrawal zilizorekodiwa.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.withdrawals.map((withdrawal) => (
                    <li key={withdrawal.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                      <span className="font-medium">{formatMoney(withdrawal.amount)}</span>
                      <span className="text-muted-foreground">Net: {formatMoney(withdrawal.net_amount)}</span>
                      <Badge variant={withdrawal.status === "paid" ? "default" : "secondary"}>
                        {withdrawal.status}
                      </Badge>
                      <time className="text-muted-foreground" dateTime={withdrawal.created_at}>
                        {formatDate(withdrawal.created_at)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
