import { useMemo, useState } from "react";
import { Users, Wallet, UserCheck, UserX, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type RecordRow = {
  created_at: string;
  activation_paid?: boolean;
  account_status?: string;
  status?: string;
  amount?: number | string;
  completed_at?: string;
};
export function AdminOverview({
  users,
  payments,
  onUsers,
}: {
  users: RecordRow[];
  payments: RecordRow[];
  onUsers: (filter: "all" | "active" | "inactive") => void;
}) {
  const [mode, setMode] = useState<"income" | "registrations">("income");
  const active = users.filter((u) => u.activation_paid && u.account_status === "active").length;
  const successful = payments.filter((p) => p.status === "success");
  const income = successful.reduce((total, p) => total + Number(p.amount || 0), 0);
  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => {
        const date = new Date();
        date.setUTCHours(0, 0, 0, 0);
        date.setUTCDate(date.getUTCDate() - 13 + index);
        const key = date.toISOString().slice(0, 10);
        return {
          key,
          label: date.toLocaleDateString("sw-TZ", {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          }),
          value:
            mode === "income"
              ? successful
                  .filter((p) => (p.completed_at || p.created_at).slice(0, 10) === key)
                  .reduce((sum, p) => sum + Number(p.amount || 0), 0)
              : users.filter((u) => u.created_at.slice(0, 10) === key).length,
        };
      }),
    [users, payments, mode],
  );
  const max = Math.max(1, ...days.map((d) => d.value));
  const total = days.reduce((sum, d) => sum + d.value, 0);
  const metrics = [
    {
      label: "Mapato yote",
      value: `TZS ${income.toLocaleString()}`,
      note: `Malipo ${successful.length} yaliyofanikiwa`,
      icon: Wallet,
      tone: "green",
      action: undefined,
    },
    {
      label: "Watumiaji",
      value: users.length.toLocaleString(),
      note: "Akaunti zilizosajiliwa",
      icon: Users,
      tone: "blue",
      action: "all" as const,
    },
    {
      label: "Active",
      value: active.toLocaleString(),
      note: `${users.length ? Math.round((active / users.length) * 100) : 0}% ya watumiaji`,
      icon: UserCheck,
      tone: "green",
      action: "active" as const,
    },
    {
      label: "Inactive",
      value: (users.length - active).toLocaleString(),
      note: "Akaunti ambazo hazijawashwa",
      icon: UserX,
      tone: "red",
      action: "inactive" as const,
    },
  ];
  return (
    <div className="admin-overview">
      <div className="admin-summary-grid">
        {metrics.map(({ label, value, note, icon: Icon, tone, action }) => {
          const content = (
            <>
              <div className="admin-stat-top">
                <span>{label}</span>
                <span className={`admin-stat-icon ${tone}`}>
                  <Icon size={22} />
                </span>
              </div>
              <strong>{value}</strong>
              <p>{note}</p>
            </>
          );
          return action ? (
            <button key={label} className="admin-stat" onClick={() => onUsers(action)}>
              {content}
            </button>
          ) : (
            <article key={label} className="admin-stat">
              {content}
            </article>
          );
        })}
      </div>
      <section className="admin-chart-card" aria-label="Takwimu za siku 14">
        <div className="admin-chart-heading">
          <h2>
            <TrendingUp size={19} /> Siku 14 zilizopita
          </h2>
          <div className="admin-chart-tabs">
            <Button
              size="sm"
              variant={mode === "income" ? "secondary" : "ghost"}
              aria-pressed={mode === "income"}
              onClick={() => setMode("income")}
            >
              Mapato
            </Button>
            <Button
              size="sm"
              variant={mode === "registrations" ? "secondary" : "ghost"}
              aria-pressed={mode === "registrations"}
              onClick={() => setMode("registrations")}
            >
              Usajili
            </Button>
          </div>
        </div>
        <strong className="admin-chart-total">
          {mode === "income" ? "TZS " : ""}
          {total.toLocaleString()}
        </strong>
        <div className="admin-chart-plot">
          <div className="admin-chart-scale">
            {[1, 0.75, 0.5, 0.25, 0].map((part) => (
              <span key={part}>{Math.round(max * part).toLocaleString()}</span>
            ))}
          </div>
          <div className="admin-chart-bars">
            {days.map((day, i) => (
              <div className="admin-chart-column" key={day.key}>
                <div
                  className="admin-chart-bar"
                  style={{ height: `${(day.value / max) * 100}%` }}
                  title={`${day.label}: ${day.value.toLocaleString()}`}
                />
                <span>{i % 3 === 0 || i === 13 ? day.label : ""}</span>
              </div>
            ))}
          </div>
        </div>
        {total === 0 && (
          <p className="admin-chart-empty">
            Hakuna {mode === "income" ? "malipo yaliyofanikiwa" : "usajili"} katika siku hizi.
          </p>
        )}
        <details className="admin-chart-data">
          <summary>Angalia takwimu kwa siku</summary>
          <table>
            <thead>
              <tr>
                <th>Tarehe</th>
                <th>{mode === "income" ? "Mapato (TZS)" : "Usajili"}</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.key}>
                  <td>{d.label}</td>
                  <td>{d.value.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
      <p className="admin-data-note">
        Muhtasari unatokana na akaunti na malipo ya karibuni yaliyopakiwa (hadi 1,000 kwa kila
        kundi). Balance na withdrawal ni simulizi, si pesa halisi.
      </p>
    </div>
  );
}
