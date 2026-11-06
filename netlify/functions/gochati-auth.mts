import { createHash } from "node:crypto";
import { getDatabase } from "../lib/database.js";
import { supabaseAdmin } from "../lib/supabase.js";
import type { Config, Context } from "../lib/types.js";
import { assert, checkRequest, fail, HttpError, json } from "../lib/platform.js";
import { validPhone } from "../lib/customer-care.js";
import { deliverAdminPush } from "../lib/admin-push.js";
import { sendDarsms } from "../lib/darsms.js";

export default async (req: Request, context: Context) => {
  try {
    checkRequest(req);
    const body = await req.json();
    assert(["login", "register"].includes(body.action), 400, "Ombi si sahihi.");
    const db = getDatabase();
    const bucket = createHash("sha256").update(`${context.ip}:${body.action}`).digest("hex");
    const [limit] =
      await db.sql`INSERT INTO gochati_auth_limits(bucket, expires_at) VALUES (${bucket}, now() + interval '10 minutes') ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN gochati_auth_limits.expires_at < now() THEN 1 ELSE gochati_auth_limits.attempts+1 END, expires_at=CASE WHEN gochati_auth_limits.expires_at < now() THEN now()+interval '10 minutes' ELSE gochati_auth_limits.expires_at END RETURNING attempts`;
    assert(
      Number(limit?.["attempts"]) <= (body.action === "register" ? 10 : 40),
      429,
      "Maombi ni mengi. Jaribu baada ya dakika 10.",
    );
    await db.sql`DELETE FROM gochati_auth_limits WHERE expires_at < now() - interval '1 day'`;
    const username = String(body.username || "")
      .trim()
      .toLowerCase();
    const password = body.password;
    assert(
      /^[a-z0-9_]{3,30}$/.test(username) &&
        typeof password === "string" &&
        password.length >= 6 &&
        password.length <= 256,
      400,
      "Weka username na password halali.",
    );
    if (body.action === "login") {
      const [profile] = await db.sql`SELECT email FROM gochati_users WHERE username=${username}`;
      try {
        // Always ask Identity to check credentials; never return the resolved email.
        const { data: loginData, error } = await supabaseAdmin.auth.signInWithPassword({
          email: String(profile?.["email"] || "unknown-user@invalid.invalid"),
          password,
        });
        assert(!error && profile && loginData.session, 401, "Username au password si sahihi.");
        return json({ data: { session: loginData.session } });
      } catch {
        throw new HttpError(401, "Username au password si sahihi.");
      }
    }
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const metadata = body.metadata || {};
    assert(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254,
      400,
      "Weka email halali.",
    );
    assert(body.agree_terms === true, 400, "Kubali masharti ya matumizi.");
    assert(
      typeof metadata.full_name === "string" &&
        metadata.full_name.trim().length > 0 &&
        metadata.full_name.length <= 150,
      400,
      "Weka majina yako.",
    );
    assert(/^[+\d ]{9,17}$/.test(String(metadata.phone || "")), 400, "Weka namba ya simu halali.");
    const phone = validPhone(String(metadata.phone || ""));
    const banned = await db.sql`SELECT phone FROM gochati_phone_bans WHERE phone=${phone}`;
    assert(!banned.length, 403, "Namba hii imezuiwa kujisajili. Wasiliana na customer service.");
    // Auto-confirmed public signup must never claim an allowlisted administrator email.
    const reserved = await db.sql`SELECT email FROM gochati_admin_emails WHERE email=${email}`;
    const existing =
      await db.sql`SELECT id FROM gochati_users WHERE username=${username} OR email=${email}`;
    assert(
      !reserved.length && !existing.length,
      409,
      "Usajili haujakamilika. Username/email inaweza kuwa tayari inatumika; ingia au rejesha password.",
    );
    const data = {
      username,
      full_name: metadata.full_name.trim(),
      phone: String(metadata.phone).trim(),
      country: String(metadata.country || "").slice(0, 80),
      referral_username: /^[a-z0-9_]{3,30}$/.test(String(metadata.referral_username || ""))
        ? metadata.referral_username
        : null,
    };
    let user;
    try {
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: data,
      });
      if (result.error) throw result.error;
      user = result.data.user;
    } catch {
      throw new HttpError(
        409,
        "Usajili haujakamilika. Kagua taarifa zako, au ingia ikiwa una akaunti.",
      );
    }
    try {
      await db.sql`INSERT INTO gochati_users(id,email,username,full_name,phone,country,account_status,activation_paid) VALUES (${user.id},${email},${username},${data.full_name},${data.phone},${data.country},'active',true)`;
    } catch (error) {
      // Compensate only for the Identity account created by this request.
      await supabaseAdmin.auth.admin.deleteUser(user.id);
      throw error;
    }
    context.waitUntil(deliverAdminPush().catch(() => {}));
    // Start only after both account records exist; SMS failure must not undo signup.
    context.waitUntil(
      sendDarsms(
        data.phone,
        `Hongera! ${username} Usajili wako wa GOCHATI umekamilika. Akaunti yako iko active. Endelea kuchat na kufundisha Kiswahili hapa: https://gochati.online/login`,
      ).catch(() => {
        // Provider errors may contain sensitive details; keep logs generic.
        console.error("Registration SMS delivery failed.");
      }),
    );
    const { data: loginData, error: loginError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });
    assert(!loginError && loginData.session, 500, "Usajili umefanikiwa lakini kuingia kumeshindikana.");
    return json({ data: { session: loginData.session } }, 201);
  } catch (error) {
    return fail(error);
  }
};

export const config: Config = { path: "/api/gochati-auth" };
