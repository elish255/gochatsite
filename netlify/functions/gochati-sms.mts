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
    assert(body.action === "send" || body.action === "counts", 400, "Ombi la SMS si sahihi.");
    // These fixed predicates keep the preview counts and actual recipients in sync.
    const filters: Record<Audience, string> = {
      all: "TRUE",
      premium: "is_premium IS TRUE",
      normal: "is_premium IS NOT TRUE AND is_vip IS NOT TRUE",
      active: "account_status = 'active' AND activation_paid IS TRUE",
      inactive: "(account_status = 'active' AND activation_paid IS TRUE) IS NOT TRUE",
      vip: "is_vip IS TRUE",
    };
    if (body.action === "counts") {
      const columns = audiences.map((key) => `COUNT(*) FILTER (WHERE ${filters[key]})::int AS "${key}"`);
      const { rows } = await db.pool.query(`SELECT ${columns.join(", ")} FROM gochati_users`);
      return json({ counts: rows[0] });
    }
    const audience = String(body.audience || "") as Audience;
    assert(audiences.includes(audience), 400, "Chagua kundi sahihi la watumiaji.");
    const template = String(body.message || "").trim();
    assert(template.length > 0 && template.length <= 1200, 400, "Ujumbe lazima uwe na herufi 1 hadi 1200.");
    assert(Boolean(process.env.DARSMS_API_KEY), 503, "Weka DARSMS_API_KEY kwenye environment variables.");

    const { rows: recipients } = await db.pool.query(
      `SELECT username, phone FROM gochati_users WHERE ${filters[audience]} ORDER BY created_at DESC LIMIT 501`,
    );
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
