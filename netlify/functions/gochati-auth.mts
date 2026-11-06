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
  const { data: banned, error: banError } = await supabaseAdmin
    .from("gochati_phone_bans")
    .select("phone")
    .eq("phone", phone)
    .limit(1);
  assert(!banError, 500, "Usajili umeshindikana kwa muda. Jaribu tena baadaye.");
  assert(!banned?.length, 403, "Namba hii imezuiwa kujisajili. Wasiliana na customer service.");

  // Read signup uniqueness from the same Supabase project as Supabase Auth.
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("gochati_users")
    .select("id")
    .or(`username.eq.${username},email.eq.${email}`)
    .limit(1);
  assert(!existingError, 500, "Usajili umeshindikana kwa muda. Jaribu tena baadaye.");
  assert(
    !existing?.length,
    409,
    "Taarifa hizi tayari zinatumika. Chagua username nyingine au kagua ombi lililopo.",
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
      // A previous request may have created the Auth user before the profile insert failed.
      // Reuse that orphaned Auth record so a retry can finish registration instead of
      // returning a misleading duplicate-account conflict.
      const users = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const orphanedUser = users.data.users.find(
        (candidate) => candidate.email?.toLowerCase() === email && !existing?.length,
      );
      if (orphanedUser) {
        const updated = await supabaseAdmin.auth.admin.updateUserById(orphanedUser.id, {
          password,
          email_confirm: true,
          user_metadata: data,
        });
        if (updated.error) throw updated.error;
        user = updated.data.user;
      } else {
        const result = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: data,
        });
        if (result.error) throw result.error;
        user = result.data.user;
      }
    } catch (error) {
      if ((error as { code?: string })?.code === "email_exists") {
        throw new HttpError(
          409,
          "Usajili haujakamilika. Email hii tayari inatumika; ingia au rejesha password.",
        );
      }
      throw new HttpError(500, "Usajili umeshindikana kwa muda. Jaribu tena baadaye.");
    }
  const { error: profileError } = await supabaseAdmin.from("gochati_users").insert({
    id: user.id,
    email,
    username,
    full_name: data.full_name,
    phone: data.phone,
    country: data.country,
    account_status: "active",
    activation_paid: true,
  });
  if (profileError) {
    // Compensate only for the Auth account created by this request.
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    throw profileError;
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
