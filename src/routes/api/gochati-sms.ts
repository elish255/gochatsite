import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SPRINGTECH_ENDPOINT = "https://sms.springtech.co.tz/api/v1/vendor/message/send";
const MAX_GROUP_SIZE = 500;
const SEND_CONCURRENCY = 5;

const audiences = ["all", "premium", "normal", "active", "inactive", "vip"] as const;
type Audience = (typeof audiences)[number];

type Recipient = { username: string; phone: string };

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function supabaseConfig() {
  const env = process.env;
  const url = env["SUPABASE_URL"] || env["VITE_SUPABASE_URL"] || "";
  const anonKey =
    env["SUPABASE_PUBLISHABLE_KEY"] ||
    env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    env["SUPABASE_ANON_KEY"] ||
    "";
  const serviceKey = env["SUPABASE_SERVICE_ROLE_KEY"] || "";
  if (!url || !anonKey || !serviceKey) {
    throw new HttpError(503, "Huduma ya SMS haijawekwa sawa kwenye server.");
  }
  return { url, anonKey, serviceKey };
}

async function requireAdmin(request: Request): Promise<SupabaseClient> {
  const { url, anonKey, serviceKey } = supabaseConfig();
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new HttpError(401, "Hujaingia.");

  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const authClient = createClient(url, anonKey, options);
  const { data, error } = await authClient.auth.getUser(token);
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

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generatePassword(length = 8) {
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(bytes, (n) => PASSWORD_ALPHABET[n % PASSWORD_ALPHABET.length]).join("");
}

async function resetPasswordBySms(rawPhone: unknown) {
  const phone = normalizeTanzaniaPhone(typeof rawPhone === "string" ? rawPhone : "");
  if (!phone) throw new HttpError(400, "Weka namba ya simu sahihi, mfano 0712345678.");

  const { url, serviceKey } = supabaseConfig();
  const db = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.rpc("gochati_claim_password_reset", {
    p_digits: phone.slice(-9),
  });
  if (error) {
    console.error("Password reset lookup failed", error);
    throw new HttpError(500, "Ombi halijakamilika. Jaribu tena.");
  }

  for (const account of (data ?? []) as { id: string; username: string }[]) {
    const password = generatePassword();
    const text = `GOCHATI: Habari ${account.username}, password yako mpya ni: ${password}\nIngia kwa username "${account.username}" na password hii. Usimpe mtu yeyote.`;
    const sent = await sendSpringTechSms(phone, text).catch((sendError) => {
      console.error("Password reset SMS failed", sendError);
      return false;
    });
    if (!sent) {
      await db.from("gochati_users").update({ password_reset_sms_at: null }).eq("id", account.id);
      continue;
    }
    const { error: updateError } = await db.auth.admin.updateUserById(account.id, { password });
    if (updateError) {
      console.error("Password reset update failed", updateError.message);
      await db.from("gochati_users").update({ password_reset_sms_at: null }).eq("id", account.id);
    }
  }
  return { ok: true };
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

export function normalizeTanzaniaPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (/^255[67]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^0[67]\d{8}$/.test(digits)) return `+255${digits.slice(1)}`;
  if (/^[67]\d{8}$/.test(digits)) return `+255${digits}`;
  return null;
}

async function sendSpringTechSms(phone: string, message: string) {
  const apiKey = process.env["SPRINGTECH_API_KEY"] || "";
  const apiSecret = process.env["SPRINGTECH_API_SECRET"] || "";
  const senderId = process.env["SPRINGTECH_SENDER_ID"] || "";
  if (!apiKey || !apiSecret || !senderId) {
    throw new HttpError(503, "Mipangilio ya SpringTech SMS haijawekwa kwenye server.");
  }

  const response = await fetch(SPRINGTECH_ENDPOINT, {
    method: "POST",
    headers: {
      api_key: apiKey,
      api_secret: apiSecret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      senderId,
      messageType: "text",
      message,
      contacts: phone,
      ...(process.env["SPRINGTECH_DELIVERY_REPORT_URL"]
        ? { deliveryReportUrl: process.env["SPRINGTECH_DELIVERY_REPORT_URL"] }
        : {}),
    }),
  });
  const result = (await response.json().catch(() => null)) as { success?: boolean } | null;
  if (!response.ok || result?.success !== true) {
    console.error("SpringTech SMS rejected", response.status);
    return false;
  }
  return true;
}

async function loadRecipients(
  db: SupabaseClient,
  audience: string,
  userId: unknown,
): Promise<Recipient[]> {
  if (audience === "individual") {
    if (typeof userId !== "string" || !userId) throw new HttpError(400, "Mtumiaji hajachaguliwa.");
    const { data, error } = await db
      .from("gochati_users")
      .select("username, phone")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new HttpError(500, "Imeshindwa kupakia mtumiaji.");
    if (!data) throw new HttpError(404, "Mtumiaji hajapatikana.");
    return [data as Recipient];
  }

  if (!audiences.includes(audience as Audience)) {
    throw new HttpError(400, "Kundi la wapokeaji si sahihi.");
  }
  const { data, error } = await applyAudience(
    db
      .from("gochati_users")
      .select("username, phone")
      .limit(MAX_GROUP_SIZE + 1),
    audience as Audience,
  );
  if (error) throw new HttpError(500, "Imeshindwa kupakia wapokeaji.");
  const rows = (data ?? []) as Recipient[];
  if (rows.length > MAX_GROUP_SIZE) {
    throw new HttpError(400, "Kundi lina zaidi ya watumiaji 500. Chagua kundi dogo.");
  }
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
        const text = template.replace(/\[\s*username\s*\]/gi, recipient.username || "");
        ok = await sendSpringTechSms(phone, text).catch((error) => {
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

export const Route = createFileRoute("/api/gochati-sms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            action?: unknown;
            message?: unknown;
            audience?: unknown;
            user_id?: unknown;
            phone?: unknown;
          };

          if (body.action === "reset_password") {
            return Response.json(await resetPasswordBySms(body.phone));
          }

          const db = await requireAdmin(request);

          if (body.action === "counts") {
            return Response.json({ counts: await audienceCounts(db) });
          }

          if (body.action === "send") {
            const message = typeof body.message === "string" ? body.message.trim() : "";
            if (!message) throw new HttpError(400, "Andika ujumbe wa SMS.");
            if (message.length > 1200) throw new HttpError(400, "Ujumbe ni mrefu kupita kiasi.");
            const recipients = await loadRecipients(db, String(body.audience || ""), body.user_id);
            if (!recipients.length) throw new HttpError(400, "Hakuna wapokeaji kwenye kundi hili.");
            return Response.json(await sendToRecipients(recipients, message));
          }

          throw new HttpError(400, "Kitendo hakijulikani.");
        } catch (error) {
          if (error instanceof HttpError) {
            return Response.json({ message: error.message }, { status: error.status });
          }
          console.error("gochati-sms failed", error);
          return Response.json({ message: "SMS hazijatumwa. Jaribu tena." }, { status: 500 });
        }
      },
    },
  },
});
