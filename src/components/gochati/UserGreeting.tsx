import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { platform } from "@/integrations/supabase/platform";
import { supabase } from "@/integrations/supabase/client";

type GreetingProfile = { username: string } | null;

const greetingQueryKey = ["gochati-user-greeting"] as const;

async function loadGreetingProfile(): Promise<GreetingProfile> {
  const {
    data: { user },
    error,
  } = await platform.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await platform
    .from("gochati_users")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const profileUsername =
    typeof profile?.["username"] === "string" ? profile["username"].trim().replace(/^@+/, "") : "";
  const metadataUsername =
    typeof user.user_metadata?.["username"] === "string"
      ? user.user_metadata["username"].trim().replace(/^@+/, "")
      : "";
  const emailUsername = user.email?.split("@")[0]?.trim() ?? "";
  const username = profileUsername || metadataUsername || emailUsername;

  return username ? { username } : null;
}

export function UserGreeting() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: greetingQueryKey,
    queryFn: loadGreetingProfile,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        queryClient.setQueryData<GreetingProfile>(greetingQueryKey, null);
        void queryClient.invalidateQueries({ queryKey: greetingQueryKey });
      } else if (event === "USER_UPDATED") {
        void queryClient.invalidateQueries({ queryKey: greetingQueryKey });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  if (!profile?.username) return null;

  return (
    <section aria-label="Ujumbe wa kukaribisha" className="card-soft mt-4 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        DASHBOARD
      </p>
      <h2 className="mt-1 text-xl font-bold text-foreground">Welcome, @{profile.username}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Karibu tena. Tayari kuendelea na mazungumzo yako?
      </p>
    </section>
  );
}
