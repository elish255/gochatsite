import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { platform } from "@/integrations/supabase/platform";
import { useAuthSession } from "./AuthSession";

export function AccountControl() {
  const { user } = useAuthSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const className =
    "grad-brand mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-on-color shadow-lg";
  if (!user)
    return (
      <div className="mt-3 flex w-full items-center gap-2">
        <Button asChild variant="reference" className="grad-brand flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center text-xs font-bold text-on-color shadow-lg">
          <Link to="/register">
            <UserPlus className="size-4 shrink-0" /> Fungua Account Hapa
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center text-xs font-bold">
          <Link to="/login">
            <LogIn className="size-4 shrink-0" /> Ingia Hapa
          </Link>
        </Button>
      </div>
    );
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
      <span className="min-w-0 truncate font-semibold">
        {user.user_metadata["full_name"] || user.email}
      </span>
      <Button
        variant="ghost"
        onClick={async () => {
          await queryClient.cancelQueries();
          queryClient.clear();
          const { error } = await platform.auth.signOut();
          if (!error) await navigate({ to: "/login", replace: true });
        }}
      >
        <LogOut /> Toka
      </Button>
    </div>
  );
}
