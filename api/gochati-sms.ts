/** Vercel Serverless Function for POST /api/gochati-sms (admin-only Swala SMS sender). */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

type VercelRequest = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type VercelResponse = { status(code: number): VercelResponse; json(body: unknown): void; send(body: string): void; setHeader(name: string, value: string): void };

const SWALA_ENDPOINT = "https://api.swalasms.com/v1/sms/messages";
const MAX_GROUP_SIZE = 500;
const SEND_CONCURRENCY = 5;
const USERNAME_PLACEHOLDER = /\[\s*username\s*\]/gi;

const audiences = ["all", "premium", "normal", "active", "inactive", "vip"] as const;
type Audience = (typeof audiences)[number];
type Recipient = { username: string; phone: string };

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function supabaseConfig() {
  const env = process.env;
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const anonKey = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || "";
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !anonKey || !serviceKey) throw new HttpError(503, "Huduma ya SMS haijawekwa sawa kwenye server.");
  return { url, anonKey, serviceKey };
}

async function requireAdmin(req: VercelRequest): Promise<SupabaseClient> {
  const { url, anonKey, serviceKey } = supabaseConfig();
  const raw = req.headers.authorization;
  const header = (Array.isArray(raw) ? raw[0] : raw) || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new HttpError(401, "Hujaingia.");

  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const { data, error } = await createClient(url, anonKey, options).auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Session ya Admin haijathibitishwa.");

  const adminClient = createClient(url, serviceKey, options);
  const { data: admin, error: adminError } = await adminClient
    .from("gochati_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (adminError || !admin) throw new HttpError(403, "Ruhusa ya Admin inahitajika.");
  return adminClient;
}

const WITHDRAWAL_THRESHOLD = 100000;
const THRESHOLD_SMS_TEMPLATE =
  "[Username] Hongera Sana!\nUmefikia Kiwango Cha kutoa Pesa, Ungana na Watanzania Wengine Kunufaika na Hii Fursa Kamilisha Upgrade ili kupokea Withdrawal Yako";

async function requireUser(req: VercelRequest) {
  const { url, anonKey, serviceKey } = supabaseConfig();
  const raw = req.headers.authorization;
  const header = (Array.isArray(raw) ? raw[0] : raw) || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new HttpError(401, "Hujaingia.");
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const { data, error } = await createClient(url, anonKey, options).auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Session haijathibitishwa.");
  return { db: createClient(url, serviceKey, options), userId: data.user.id };
}

async function sendThresholdSms(db: SupabaseClient, userId: string) {
  const { data: claimed, error } = await db
    .from("gochati_users")
    .update({ withdrawal_threshold_sms_at: new Date().toISOString() })
    .eq("id", userId)
    .is("withdrawal_threshold_sms_at", null)
    .eq("account_status", "active")
    .gte("balance", WITHDRAWAL_THRESHOLD)
    .not("is_premium", "is", true)
    .not("is_vip", "is", true)
    .select("username, phone")
    .maybeSingle();
  if (error) throw new HttpError(500, "Imeshindwa kuhakiki kiwango.");
  if (!claimed) return { sent: false };

  const recipient = claimed as Recipient;
  const phone = normalizeTanzaniaPhone(recipient.phone || "");
  const ok = phone
    ? await sendSwalaSms(phone, THRESHOLD_SMS_TEMPLATE.replace(USERNAME_PLACEHOLDER, recipient.username || "")).catch(
        (sendError) => {
          console.error("Threshold SMS failed", sendError);
          return false;
        },
      )
    : false;
  if (!ok && phone) {
    await db.from("gochati_users").update({ withdrawal_threshold_sms_at: null }).eq("id", userId);
  }
  return { sent: ok };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyAudience(query: any, audience: Audience) {
  switch (audience) {
    case "premium":
      return query.eq("is_premium", true);
    case "vip":
      return query.eq("is_vip", true);
    case "normal":
      return query.eq("is_premium", false).eq("is_vip", false);
    case "active":
      return query.eq("account_status", "active");
    case "inactive":
      return query.neq("account_status", "active");
    default:
      return query;
  }
}

async function audienceCounts(db: SupabaseClient) {
  const entries = await Promise.all(
    audiences.map(async (audience) => {
      const { count, error } = await applyAudience(
        db.from("gochati_users").select("id", { count: "exact", head: true }),
        audience,
      );
      if (error) throw new HttpError(500, "Idadi ya wapokeaji haijapatikana.");
      return [audience, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<Audience, number>;
}

function normalizeTanzaniaPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (/^255[67]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^0[67]\d{8}$/.test(digits)) return `+255${digits.slice(1)}`;
  if (/^[67]\d{8}$/.test(digits)) return `+255${digits}`;
  return null;
}

async function sendSwalaSms(phone: string, body: string) {
  const apiKey = process.env.SWALA_API_KEY || "";
  const senderId = process.env.SWALA_SENDER_ID || "GOCHATI";
  if (!apiKey) throw new HttpError(503, "SWALA_API_KEY haijawekwa kwenye server.");

  const response = await fetch(SWALA_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": randomUUID() },
    body: JSON.stringify({ recipient: phone, sender_id: senderId, body }),
  });
  if (response.status !== 202 && !response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Swala SMS rejected", response.status, detail.slice(0, 300));
    return false;
  }
  return true;
}

async function loadRecipients(db: SupabaseClient, audience: string, userId: unknown): Promise<Recipient[]> {
  if (audience === "individual") {
    if (typeof userId !== "string" || !userId) throw new HttpError(400, "Mtumiaji hajachaguliwa.");
    const { data, error } = await db.from("gochati_users").select("username, phone").eq("id", userId).maybeSingle();
    if (error) throw new HttpError(500, "Imeshindwa kupakia mtumiaji.");
    if (!data) throw new HttpError(404, "Mtumiaji hajapatikana.");
    return [data as Recipient];
  }
  if (!audiences.includes(audience as Audience)) throw new HttpError(400, "Kundi la wapokeaji si sahihi.");
  const { data, error } = await applyAudience(
    db.from("gochati_users").select("username, phone").limit(MAX_GROUP_SIZE + 1),
    audience as Audience,
  );
  if (error) throw new HttpError(500, "Imeshindwa kupakia wapokeaji.");
  const rows = (data ?? []) as Recipient[];
  if (rows.length > MAX_GROUP_SIZE) throw new HttpError(400, "Kundi lina zaidi ya watumiaji 500. Chagua kundi dogo.");
  return rows;
}

async function sendToRecipients(recipients: Recipient[], template: string) {
  const results: { username: string; status: "queued" | "failed" }[] = [];
  let index = 0;
  async function worker() {
    while (index < recipients.length) {
      const recipient = recipients[index++]!;
      const phone = normalizeTanzaniaPhone(recipient.phone || "");
      let ok = false;
      if (phone) {
        const text = template.replace(USERNAME_PLACEHOLDER, recipient.username || "");
        ok = await sendSwalaSms(phone, text).catch((error) => {
          if (error instanceof HttpError) throw error;
          console.error("Swala SMS request failed", error);
          return false;
        });
      }
      results.push({ username: recipient.username, status: ok ? "queued" : "failed" });
    }
  }
  await Promise.all(Array.from({ length: SEND_CONCURRENCY }, worker));
  const queued = results.filter((row) => row.status === "queued").length;
  return { total: results.length, queued, failed: results.length - queued, results };
}

function parseBody(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed." });
  }
  try {
    const body = parseBody(req.body);

    if (body.action === "threshold") {
      const { db: userDb, userId } = await requireUser(req);
      return res.status(200).json(await sendThresholdSms(userDb, userId));
    }

    const db = await requireAdmin(req);

    if (body.action === "counts") return res.status(200).json({ counts: await audienceCounts(db) });

    if (body.action === "send") {
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (!message) throw new HttpError(400, "Andika ujumbe wa SMS.");
      if (message.length > 1200) throw new HttpError(400, "Ujumbe ni mrefu kupita kiasi.");
      const recipients = await loadRecipients(db, String(body.audience || ""), body.user_id);
      if (!recipients.length) throw new HttpError(400, "Hakuna wapokeaji kwenye kundi hili.");
      return res.status(200).json(await sendToRecipients(recipients, message));
    }

    throw new HttpError(400, "Kitendo hakijulikani.");
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
    console.error("gochati-sms failed", error);
    return res.status(500).json({ message: "SMS hazijatumwa. Jaribu tena." });
  }
}
