import { getDatabase } from "@netlify/database";
import { getIdentityConfig } from "@netlify/identity";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assert(value: unknown, status: number, message: string): asserts value {
  if (!value) throw new HttpError(status, message);
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export function fail(error: unknown) {
  if (error instanceof HttpError) return json({ message: error.message }, error.status);
  if ((error as { code?: string })?.code === "23505")
    return json(
      {
        message: "Taarifa hizi tayari zinatumika. Chagua username nyingine au kagua ombi lililopo.",
      },
      409,
    );
  return json({ message: "Huduma haipatikani kwa sasa. Tafadhali jaribu tena." }, 500);
}
export function checkRequest(req: Request) {
  assert(req.method === "POST", 405, "Method not allowed");
  const origin = req.headers.get("origin");
  assert(!origin || origin === new URL(req.url).origin, 403, "Origin not allowed");
  assert(req.headers.get("content-type")?.includes("application/json"), 415, "JSON required");
  assert(Number(req.headers.get("content-length") || 0) < 100000, 413, "Ombi ni kubwa sana.");
}
export async function authenticated(req: Request) {
  const config = getIdentityConfig();
  assert(config, 503, "Huduma ya akaunti haijawashwa.");
  const cookie = req.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("nf_jwt="));
  const token = cookie ? decodeURIComponent(cookie.slice(7)) : "";
  assert(token, 401, "Tafadhali ingia kwenye akaunti yako.");
  // Ask Identity to validate the token; never authorize from decoded claims alone.
  const response = await fetch(`${config.url.replace(/\/$/, "")}/user`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  assert(response.ok, 401, "Session imeisha. Ingia tena.");
  const user = await response.json();
  assert(user.id && user.email && user.confirmed_at, 403, "Thibitisha email yako kwanza.");
  const db = getDatabase();
  const deleted = await db.sql`SELECT id FROM gochati_deleted_users WHERE id=${user.id}`;
  assert(!deleted.length, 403, "Akaunti hii imefutwa.");
  const metadata = user.user_metadata || {};
  const username = /^[a-z0-9_]{3,30}$/.test(String(metadata.username || ""))
    ? metadata.username
    : `user_${String(user.id).replace(/-/g, "")}`;
  try {
    await db.sql`INSERT INTO gochati_users(id,email,username,full_name,phone,country) SELECT ${user.id}::uuid,${String(user.email).toLowerCase()},${username},${String(metadata.full_name || "").slice(0, 150)},${String(metadata.phone || "").slice(0, 30)},${String(metadata.country || "").slice(0, 80)} WHERE NOT EXISTS (SELECT 1 FROM gochati_deleted_users WHERE id=${user.id}) ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email`;
  } catch (error) {
    if ((error as { code?: string })?.code !== "23505") throw error;
    await db.sql`INSERT INTO gochati_users(id,email,username,full_name,phone,country) SELECT ${user.id}::uuid,${String(user.email).toLowerCase()},${`user_${String(user.id).replace(/-/g, "")}`},${String(metadata.full_name || "").slice(0, 150)},${String(metadata.phone || "").slice(0, 30)},${String(metadata.country || "").slice(0, 80)} WHERE NOT EXISTS (SELECT 1 FROM gochati_deleted_users WHERE id=${user.id}) ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email`;
  }
  const referral = String(metadata.referral_username || "").toLowerCase();
  if (/^[a-z0-9_]{3,30}$/.test(referral)) {
    await db.sql`WITH linked AS (UPDATE gochati_users SET referred_by=(SELECT id FROM gochati_users WHERE username=${referral} AND id<>${user.id}) WHERE id=${user.id} AND referred_by IS NULL RETURNING referred_by) UPDATE gochati_users SET referral_count=referral_count+1 WHERE id IN (SELECT referred_by FROM linked WHERE referred_by IS NOT NULL)`;
  }
  // Admin membership is derived only from a confirmed Identity email and a private allowlist.
  await db.sql`INSERT INTO gochati_admins(user_id) SELECT ${user.id}::uuid WHERE EXISTS (SELECT 1 FROM gochati_admin_emails WHERE email=${String(user.email).toLowerCase()}) ON CONFLICT DO NOTHING`;
  const [profile] = await db.sql`SELECT * FROM gochati_users WHERE id=${user.id}`;
  assert(profile, 404, "Taarifa za akaunti hazijapatikana.");
  const admins =
    await db.sql`SELECT user_id FROM gochati_admins WHERE user_id=${user.id} AND EXISTS(SELECT 1 FROM gochati_admin_emails WHERE email=${String(user.email).toLowerCase()})`;
  const isAdmin = admins.length > 0;
  assert(
    isAdmin || !["banned", "deactivated"].includes(String(profile["account_status"])),
    403,
    "Akaunti yako imesimamishwa. Wasiliana na admin.",
  );
  return { db, user, profile, isAdmin };
}
