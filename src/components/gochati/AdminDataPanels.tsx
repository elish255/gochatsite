import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe2, RefreshCw, Send, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { platform } from "@/integrations/supabase/platform";
import { careApi } from "./customer-care-api";

type Section = "stats" | "sessions" | "guests" | "announcements" | "payment-numbers";
type PresenceRow = {
  visitor_id: string;
  user_id: string | null;
  country: string | null;
  first_seen_at: string;
  last_seen_at: string;
};
type UserRow = {
  id?: string;
  country?: string | null;
  full_name?: string | null;
  username?: string | null;
  is_premium?: boolean;
  is_vip?: boolean;
};
type PaymentRow = { status?: string | null; amount?: number | string | null };
type AnnouncementRow = {
  id: string;
  title: string;
  message: string;
  audience: (typeof audiences)[number];
  status: "draft" | "sent";
  created_at: string;
  target_user_id?: string | null;
  payment_amount?: number | null;
};
type PaymentNumberRow = {
  id: string;
  provider: string;
  number: string;
  display_name: string;
  instructions: string;
  enabled: boolean;
};
type Props = { section: Section; adminId: string; users: UserRow[]; payments: PaymentRow[] };
const audiences = ["all", "premium", "normal", "active", "inactive", "individual"] as const;
const audienceLabels: Record<(typeof audiences)[number], string> = {
  all: "Watumiaji wote",
  premium: "Premium",
  normal: "Kawaida",
  active: "Active",
  inactive: "Inactive",
  individual: "Mtumiaji mmoja",
};

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="card-soft mt-4 space-y-4 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function AdminDataPanels({ section, adminId, users, payments }: Props) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<(typeof audiences)[number]>("all");
  const [targetUserId, setTargetUserId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [provider, setProvider] = useState("M-Pesa");
  const [number, setNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [feedback, setFeedback] = useState("");
  const queryClient = useQueryClient();
  const presenceQuery = useQuery({
    queryKey: ["gochati-presence-sessions", section],
    enabled: section === "sessions" || section === "guests",
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await platform
        .from("gochati_presence_sessions")
        .select("visitor_id,user_id,country,first_seen_at,last_seen_at")
        .order("last_seen_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as PresenceRow[];
    },
  });
  const announcementsQuery = useQuery({
    queryKey: ["gochati-admin-announcements"],
    enabled: section === "announcements",
    queryFn: async () => {
      const { data, error } = await platform
        .from("gochati_admin_announcements")
        .select("id,title,message,audience,status,created_at,sent_at,target_user_id,payment_amount")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as AnnouncementRow[];
    },
  });
  const numbersQuery = useQuery({
    queryKey: ["gochati-payment-numbers"],
    enabled: section === "payment-numbers",
    queryFn: async () => {
      const { data, error } = await platform
        .from("gochati_payment_numbers")
        .select("id,provider,number,display_name,instructions,enabled,updated_at")
        .order("provider", { ascending: true });
      if (error) throw error;
      return (data || []) as PaymentNumberRow[];
    },
  });
  const saveNumber = useMutation({
    mutationFn: async () => {
      const { error } = await platform.from("gochati_payment_numbers").insert({
        provider,
        number: number.trim(),
        display_name: displayName.trim(),
        instructions: instructions.trim(),
        updated_by: adminId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setNumber("");
      setDisplayName("");
      setInstructions("");
      setFeedback("Namba ya malipo imehifadhiwa.");
      await queryClient.invalidateQueries({ queryKey: ["gochati-payment-numbers"] });
    },
    onError: (error) =>
      setFeedback(error instanceof Error ? error.message : "Imeshindikana kuhifadhi namba."),
  });
  const sendAnnouncement = useMutation({
    mutationFn: async () => {
      const cleanTitle = title.trim();
      const cleanMessage = message.trim();
      if (!cleanTitle || !cleanMessage) throw new Error("Jaza kichwa na ujumbe.");

      if (audience === "individual") {
        const amount = Number(paymentAmount);
        if (!targetUserId) throw new Error("Chagua mtumiaji mmoja.");
        if (!Number.isInteger(amount) || amount < 100 || amount > 10000000) {
          throw new Error("Weka kiasi cha VIP kati ya TZS 100 na 10,000,000.");
        }
        const { data, error } = await platform.rpc("gochati_send_targeted_announcement", {
          p_target_user_id: targetUserId,
          p_title: cleanTitle,
          p_message: cleanMessage,
          p_payment_amount: amount,
        });
        if (error) throw error;
        return { notifications: Number(data || 0), pushSent: 0, pushError: "", targeted: true };
      }

      const { data: draft, error: insertError } = await platform
        .from("gochati_admin_announcements")
        .insert({ title: cleanTitle, message: cleanMessage, audience, created_by: adminId })
        .select("id")
        .single();
      if (insertError) throw insertError;
      const { data, error: broadcastError } = await platform.rpc("gochati_broadcast", {
        audience,
        message: cleanMessage,
      });
      if (broadcastError) throw broadcastError;
      const { error: updateError } = await platform
        .from("gochati_admin_announcements")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", draft.id);
      if (updateError) throw updateError;
      let pushSent = 0;
      let pushError = "";
      try {
        const result = await careApi({
          action: "broadcast-push",
          title: cleanTitle,
          message: cleanMessage,
          audience,
        });
        pushSent = Number(result.sent || 0);
      } catch (error) {
        pushError = error instanceof Error ? error.message : "Push haikutumwa.";
      }
      return { notifications: Number(data || 0), pushSent, pushError, targeted: false };
    },
    onSuccess: async (result) => {
      setTitle("");
      setMessage("");
      setTargetUserId("");
      setPaymentAmount("");
      setFeedback(
        result.targeted
          ? "Tangazo limehifadhiwa na litaonekana kama popup kwa mtumiaji. Kiasi hicho kimewekwa kuwa ada yake ya VIP."
          : `Notification ya ndani imetumwa kwa ${result.notifications}; push imefikishwa kwenye vifaa ${result.pushSent}.${result.pushError ? ` Push: ${result.pushError}` : ""}`,
      );
      await queryClient.invalidateQueries({ queryKey: ["gochati-admin-announcements"] });
    },
    onError: (error) =>
      setFeedback(error instanceof Error ? error.message : "Imeshindikana kutuma tangazo."),
  });
  const presence = presenceQuery.data || [];
  const onlineCutoff = Date.now() - 90_000;
  const onlineRows = presence.filter((row) => new Date(row.last_seen_at).getTime() > onlineCutoff);
  const guests = presence.filter((row) => row.user_id === null);
  const onlineGuests = onlineRows.filter((row) => row.user_id === null);
  const userCountries = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const user of users) {
      const country = String(user.country || "Haijulikani").trim() || "Haijulikani";
      grouped.set(country, (grouped.get(country) || 0) + 1);
    }
    return [...grouped.entries()].sort((a, b) => b[1] - a[1]);
  }, [users]);
  const successPayments = payments.filter((payment) => payment.status === "success");
  const totalIncome = successPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  );

  if (section === "stats")
    return (
      <Panel
        title="Analytics za biashara"
        description="Muhtasari unatokana na akaunti, malipo yaliyofanikiwa na rekodi za nchi zilizopo."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Akaunti", value: users.length, icon: Users },
            { label: "Malipo yaliyofanikiwa", value: successPayments.length, icon: Wallet },
            {
              label: "Mapato yaliyorekodiwa",
              value: `TZS ${totalIncome.toLocaleString()}`,
              icon: Wallet,
            },
          ].map(({ label, value, icon: Icon }) => (
            <article key={label} className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="size-4" />
                {label}
              </div>
              <p className="mt-2 text-xl font-bold">{value}</p>
            </article>
          ))}
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-2 font-semibold">
            <Globe2 className="size-4" />
            Watumiaji kwa nchi
          </h3>
          {userCountries.length ? (
            <div className="divide-y divide-border">
              {userCountries.map(([country, count]) => (
                <div className="flex justify-between py-2 text-sm" key={country}>
                  <span>{country}</span>
                  <strong>{count.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Hakuna rekodi za nchi bado.</p>
          )}
        </div>
      </Panel>
    );

  if (section === "sessions" || section === "guests")
    return (
      <Panel
        title={section === "sessions" ? "Sessions na waliopo online" : "Wageni wa tovuti"}
        description="Online huhesabiwa kwa heartbeat iliyopokelewa ndani ya sekunde 90. Orodha ina hadi sessions 1,000 za karibuni."
      >
        {presenceQuery.isLoading ? (
          <p role="status">Inapakia sessions...</p>
        ) : presenceQuery.error ? (
          <p role="alert" className="text-sm text-destructive">
            {presenceQuery.error.message}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">Online sasa</p>
                <strong className="text-2xl">
                  {section === "guests" ? onlineGuests.length : onlineRows.length}
                </strong>
              </article>
              <article className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">
                  {section === "guests" ? "Sessions za wageni" : "Sessions zilizorekodiwa"}
                </p>
                <strong className="text-2xl">
                  {section === "guests" ? guests.length : presence.length}
                </strong>
              </article>
              <article className="rounded-xl border border-border p-4">
                <p className="text-sm text-muted-foreground">Akaunti online</p>
                <strong className="text-2xl">
                  {new Set(onlineRows.flatMap((row) => (row.user_id ? [row.user_id] : []))).size}
                </strong>
              </article>
            </div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">
                {section === "guests" ? "Sessions za wageni wa karibuni" : "Sessions za karibuni"}
              </h3>
              <Button variant="outline" size="sm" onClick={() => void presenceQuery.refetch()}>
                <RefreshCw className="mr-2 size-4" />
                Pakia upya
              </Button>
            </div>
            <div className="max-h-[28rem] overflow-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr>
                    <th className="p-3">Aina</th>
                    <th className="p-3">Nchi</th>
                    <th className="p-3">Mara ya mwisho</th>
                    <th className="p-3">Hali</th>
                  </tr>
                </thead>
                <tbody>
                  {(section === "guests" ? guests : presence).map((row) => (
                    <tr key={row.visitor_id} className="border-t border-border">
                      <td className="p-3">{row.user_id ? "Mtumiaji" : "Mgeni"}</td>
                      <td className="p-3">{row.country || "Haijulikani"}</td>
                      <td className="p-3">{new Date(row.last_seen_at).toLocaleString("sw-TZ")}</td>
                      <td className="p-3">
                        {new Date(row.last_seen_at).getTime() > onlineCutoff ? "Online" : "Offline"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(section === "guests" ? guests : presence).length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">Hakuna rekodi bado.</p>
              )}
            </div>
          </>
        )}
      </Panel>
    );

  if (section === "announcements")
    return (
      <Panel
        title="Matangazo na push"
        description="Tuma ujumbe kwa kundi au mtu mmoja. Tangazo la mtu mmoja huonekana kama popup na linaweza kuelekeza kwenye malipo ya VIP."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            Kichwa
            <input
              className="auth-input w-full"
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Habari za Gochati"
            />
          </label>
          <label className="space-y-1 text-sm">
            Kundi
            <select
              className="auth-input w-full"
              value={audience}
              onChange={(event) => setAudience(event.target.value as (typeof audiences)[number])}
            >
              {audiences.map((item) => (
                <option key={item} value={item}>
                  {audienceLabels[item]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {audience === "individual" && (
          <div className="grid gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              Mtumiaji
              <select
                className="auth-input w-full"
                value={targetUserId}
                onChange={(event) => setTargetUserId(event.target.value)}
                required
              >
                <option value="">Chagua mtumiaji</option>
                {users.filter((item) => item.id && item.is_premium && !item.is_vip).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.full_name || item.username || item.id} {item.username ? `(@${item.username})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Kiasi cha VIP (TZS)
              <input
                className="auth-input w-full"
                type="number"
                min="100"
                max="10000000"
                step="1"
                inputMode="numeric"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                placeholder="Weka bei ya VIP"
                required
              />
            </label>
            <p className="text-xs leading-relaxed text-muted-foreground sm:col-span-2">
              Chagua mtumiaji wa Premium ambaye bado si VIP. Kiasi hiki kitawekwa kuwa bei yake binafsi ya VIP; popup itaonyesha kitufe cha Lipa sasa na kufungua ukurasa rasmi wa malipo.
            </p>
          </div>
        )}
        <label className="block space-y-1 text-sm">
          Ujumbe
          <textarea
            className="auth-input min-h-28 w-full resize-y"
            maxLength={2000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Andika tangazo kwa watumiaji..."
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={
              sendAnnouncement.isPending ||
              (audience === "individual" && (!targetUserId || !paymentAmount))
            }
            onClick={() => sendAnnouncement.mutate()}
          >
            <Send className="mr-2 size-4" />
            {sendAnnouncement.isPending ? "Inatuma..." : "Tuma tangazo"}
          </Button>
          {feedback && (
            <p role="status" className="text-sm text-muted-foreground">
              {feedback}
            </p>
          )}
        </div>
        <div>
          <h3 className="mb-2 font-semibold">Historia ya matangazo</h3>
          {announcementsQuery.isLoading ? (
            <p>Inapakia...</p>
          ) : announcementsQuery.error ? (
            <p role="alert" className="text-sm text-destructive">
              {announcementsQuery.error.message}
            </p>
          ) : (
            (announcementsQuery.data || []).map((item) => (
              <article key={item.id} className="border-t border-border py-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{item.title}</strong>
                  <span className="text-xs text-muted-foreground">
                    {item.status === "sent" ? "Imetumwa" : "Rasimu"} ·{" "}
                    {audienceLabels[item.audience as (typeof audiences)[number]]} ·{" "}
                    {new Date(item.created_at).toLocaleString("sw-TZ")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                {item.audience === "individual" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Kwa {users.find((person) => person.id === item.target_user_id)?.username || "mtumiaji"}
                    {item.payment_amount
                      ? ` · Ada ya VIP: TZS ${Number(item.payment_amount).toLocaleString("en-US")}`
                      : ""}
                  </p>
                )}
              </article>
            ))
          )}
        </div>
      </Panel>
    );

  if (section === "payment-numbers")
    return (
      <Panel
        title="Lipa Namba"
        description="Hifadhi namba za malipo na maelekezo kwa kila provider. Thamani hizi zitaonekana hapa kwa wasimamizi pekee."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            Provider
            <select
              className="auth-input w-full"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
            >
              {["M-Pesa", "Tigo Pesa", "Airtel Money", "HaloPesa", "Mixx by Yas"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Namba
            <input
              className="auth-input w-full"
              inputMode="tel"
              maxLength={32}
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              placeholder="255..."
            />
          </label>
          <label className="space-y-1 text-sm">
            Jina la kuonyesha
            <input
              className="auth-input w-full"
              maxLength={100}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Jina la mmiliki wa namba"
            />
          </label>
          <label className="space-y-1 text-sm">
            Maelekezo
            <input
              className="auth-input w-full"
              maxLength={300}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="Maelekezo ya malipo"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={saveNumber.isPending || !number.trim()}
            onClick={() => saveNumber.mutate()}
          >
            <Wallet className="mr-2 size-4" />
            {saveNumber.isPending ? "Inahifadhi..." : "Hifadhi namba"}
          </Button>
          {feedback && (
            <p role="status" className="text-sm text-muted-foreground">
              {feedback}
            </p>
          )}
        </div>
        {numbersQuery.isLoading ? (
          <p>Inapakia namba...</p>
        ) : numbersQuery.error ? (
          <p role="alert" className="text-sm text-destructive">
            {numbersQuery.error.message}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {(numbersQuery.data || []).map((item) => (
              <article
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3"
              >
                <div>
                  <strong>
                    {item.provider} · {item.number}
                  </strong>
                  <p className="text-sm text-muted-foreground">
                    {item.display_name || ""}
                    {item.instructions ? ` — ${item.instructions}` : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const { error } = await platform
                      .from("gochati_payment_numbers")
                      .update({
                        enabled: !item.enabled,
                        updated_by: adminId,
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", item.id);
                    setFeedback(
                      error?.message || `Namba ${item.enabled ? "imezimwa" : "imewashwa"}.`,
                    );
                    if (!error)
                      await queryClient.invalidateQueries({
                        queryKey: ["gochati-payment-numbers"],
                      });
                  }}
                >
                  {item.enabled ? "Zima" : "Washa"}
                </Button>
              </article>
            ))}
          </div>
        )}
      </Panel>
    );
  return null;
}
