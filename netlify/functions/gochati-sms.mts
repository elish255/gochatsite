import type { Config } from "@netlify/functions";
import { authenticated, assert, checkRequest, fail, json } from "../lib/platform.js";
import { normalizeTanzaniaPhone, sendDarsms } from "../lib/darsms.js";

const audiences = ["all", "premium", "normal", "active", "inactive", "vip"] as const;
type Audience = (typeof audiences)[number];

export default async (req: Request) => {
  try {
    checkRequest(req);
    const { db, user, isAdmin } = await authenticated(req);
    assert(isAdmin, 403, "Huruhusiwi kutuma SMS kupitia admin panel.");
    assert(req.headers.get("cookie")?.includes("nf_jwt="), 401, "Session ya admin haipo.");
    const body = await req.json();
    assert(body.action === "send", 400, "Ombi la SMS si sahihi.");
    const audience = String(body.audience || "") as Audience;
    assert(audiences.includes(audience), 400, "Chagua kundi sahihi la watumiaji.");
    const template = String(body.message || "").trim();
    assert(template.length > 0 && template.length <= 1200, 400, "Ujumbe lazima uwe na herufi 1 hadi 1200.");
    assert(Boolean(process.env.DARSMS_API_KEY), 503, "Weka DARSMS_API_KEY kwenye environment variables.");

    const all = await db.sql`SELECT id, username, phone, account_status, activation_paid, is_premium, is_vip FROM gochati_users ORDER BY created_at DESC LIMIT 5000`;
    const recipients = all.filter((row: Record<string, unknown>) => {
      const active = row.account_status === "active" && row.activation_paid === true;
      if (audience === "all") return true;
      if (audience === "premium") return row.is_premium === true;
      if (audience === "normal") return row.is_premium !== true && row.is_vip !== true;
      if (audience === "active") return active;
      if (audience === "inactive") return !active;
      return row.is_vip === true;
    });
    assert(recipients.length > 0, 400, "Hakuna watumiaji kwenye kundi ulilochagua.");
    assert(recipients.length <= 500, 413, "Kundi lina zaidi ya watumiaji 500. Chagua kundi dogo.");

    const outcomes: { username: string; status: string; reason?: string }[] = [];
    for (const row of recipients as Record<string, unknown>[]) {
      const username = String(row.username || "mtumiaji");
      const phone = normalizeTanzaniaPhone(row.phone);
      if (!phone) {
        outcomes.push({ username, status: "failed", reason: "Namba ya simu si sahihi" });
        continue;
      }
      const message = template.replace(/\[\s*username\s*\]/gi, username);
      try {
        await sendDarsms(phone, message);
        outcomes.push({ username, status: "queued" });
      } catch (error) {
        outcomes.push({ username, status: "failed", reason: error instanceof Error ? error.message : "DARSMS error" });
      }
    }
    await db.sql`INSERT INTO gochati_admin_audit(admin_id, action, target_id, changes) VALUES (${user.id}, ${"send_sms"}, ${audience}, ${JSON.stringify({ total: outcomes.length, queued: outcomes.filter((x) => x.status === "queued").length, failed: outcomes.filter((x) => x.status === "failed").length })}::jsonb)`;
    return json({
      total: outcomes.length,
      queued: outcomes.filter((x) => x.status === "queued").length,
      failed: outcomes.filter((x) => x.status === "failed").length,
      results: outcomes.slice(0, 100),
    });
  } catch (error) {
    return fail(error);
  }
};

export const config: Config = { path: "/api/gochati-sms" };
