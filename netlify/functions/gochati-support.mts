import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { authenticated, assert, checkRequest, fail, json } from "../lib/platform.js";
import { attachmentKind, validPhone, validPushEndpoint } from "../lib/customer-care.js";
import { deliverAdminPush, pushKeys } from "../lib/admin-push.js";

export default async (req: Request, context: Context) => {
  try {
    const { db, user, profile, isAdmin } = await authenticated(req);
    const url = new URL(req.url);
    // Files are private: both participant and active status are checked on every download.
    if (req.method === "GET") {
      const id = url.searchParams.get("file");
      assert(id && /^[\da-f-]{36}$/i.test(id), 400, "Faili si sahihi.");
      const [m] = await db.sql`SELECT * FROM gochati_support_messages WHERE id=${id}`;
      assert(
        m &&
          (isAdmin ||
            (m["user_id"] === user.id &&
              profile["account_status"] === "active")),
        403,
        "Huna ruhusa.",
      );
      assert(m["blob_key"], 404, "Faili halipo.");
      const bytes = await getStore({ name: "gochati-customer-care", consistency: "strong" }).get(
        String(m["blob_key"]),
        { type: "arrayBuffer" },
      );
      assert(bytes, 404, "Faili halipatikani.");
      const headers = new Headers({
        "Content-Type": String(m["mime"]),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Accept-Ranges": "bytes",
        "Content-Length": String(bytes.byteLength),
      });
      const range = req.headers.get("range");
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        const start = match?.[1]
          ? Number(match[1])
          : match?.[2]
            ? Math.max(0, bytes.byteLength - Number(match[2]))
            : NaN;
        const end =
          match?.[1] && match?.[2]
            ? Math.min(Number(match[2]), bytes.byteLength - 1)
            : bytes.byteLength - 1;
        if (!Number.isSafeInteger(start) || start < 0 || start > end || start >= bytes.byteLength) {
          headers.set("Content-Range", `bytes */${bytes.byteLength}`);
          headers.set("Content-Length", "0");
          return new Response(null, { status: 416, headers });
        }
        headers.set("Content-Range", `bytes ${start}-${end}/${bytes.byteLength}`);
        headers.set("Content-Length", String(end - start + 1));
        return new Response(bytes.slice(start, end + 1), { status: 206, headers });
      }
      return new Response(bytes, { headers });
    }
    const origin = req.headers.get("origin");
    assert(!origin || origin === url.origin, 403, "Origin not allowed");
    assert(req.method === "POST", 405, "Method not allowed");
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      assert(
        Number(req.headers.get("content-length") || 0) <= 4_300_000,
        413,
        "Faili lisizidi MB 4.",
      );
      const raw = await req.arrayBuffer();
      assert(raw.byteLength <= 4_300_000, 413, "Faili lisizidi MB 4.");
      const form = await new Request(req.url, {
        method: "POST",
        headers: { "content-type": req.headers.get("content-type")! },
        body: raw,
      }).formData();
      const target = String(form.get("user_id") || user.id);
      await canChat(target);
      await rateLimit();
      const file = form.get("file");
      assert(
        file instanceof File && file.size > 0 && file.size <= 4_000_000,
        400,
        "Chagua faili lisilozidi MB 4.",
      );
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = file.type.split(";")[0] || "";
      const kind = attachmentKind(bytes, mime);
      const key = `${target}/${crypto.randomUUID()}`;
      const store = getStore({ name: "gochati-customer-care", consistency: "strong" });
      await store.set(key, bytes.buffer);
      try {
        await db.sql`INSERT INTO gochati_support_messages(user_id,sender_id,sender,kind,blob_key,mime) VALUES(${target},${user.id},${isAdmin ? "admin" : "user"},${kind},${key},${mime})`;
      } catch (error) {
        await store.delete(key);
        throw error;
      }
      context.waitUntil(deliverAdminPush().catch(() => {}));
      return json({ ok: true }, 201);
    }
    checkRequest(req);
    const body = await req.json();
    const action = body.action;
    if (
      [
        "inbox",
        "events",
        "read-events",
        "bans",
        "ban",
        "unban",
        "push-key",
        "subscribe",
        "unsubscribe",
      ].includes(action)
    ) {
      assert(isAdmin, 403, "Admin pekee.");
      if (action === "inbox") {
        const search = `%${String(body.search || "")
          .trim()
          .slice(0, 100)}%`;
        const rows =
          await db.sql`SELECT u.id,u.username,u.full_name,u.account_status,m.body,m.kind,m.created_at,
          (SELECT count(*)::int FROM gochati_support_messages x WHERE x.user_id=u.id AND x.sender='user' AND x.read_at IS NULL) AS unread
          FROM gochati_users u JOIN LATERAL (SELECT body,kind,created_at FROM gochati_support_messages WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1) m ON true
          WHERE u.username ILIKE ${search} OR u.full_name ILIKE ${search} OR u.phone ILIKE ${search}
          ORDER BY m.created_at DESC LIMIT 200`;
        return json({ data: rows });
      }
      if (action === "events")
        return json({
          data: await db.sql`SELECT e.*,u.username FROM gochati_admin_events e LEFT JOIN gochati_users u ON u.id=e.user_id ORDER BY (e.read_at IS NULL) DESC,e.id DESC LIMIT 100`,
        });
      if (action === "read-events") {
        assert(/^\d+$/.test(String(body.id)), 400, "Arifa si sahihi.");
        await db.sql`UPDATE gochati_admin_events SET read_at=now() WHERE id<=${body.id}`;
        return json({ ok: true });
      }
      if (action === "bans")
        return json({
          data: await db.sql`SELECT phone,reason,created_at FROM gochati_phone_bans ORDER BY created_at DESC LIMIT 500`,
        });
      if (action === "ban" || action === "unban") {
        const phone = validPhone(String(body.phone || ""));
        const reason = String(body.reason || "")
          .trim()
          .slice(0, 300);
        const client = await db.pool.connect();
        try {
          await client.query("BEGIN");
          await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [phone]);
          if (action === "ban") {
            const admins = await client.query(
              "SELECT 1 FROM gochati_users u JOIN gochati_admin_emails a ON a.email=u.email WHERE gochati_normalize_phone(u.phone)=$1",
              [phone],
            );
            assert(!admins.rows.length, 403, "Huwezi kuzuia namba ya admin.");
            await client.query(
              "INSERT INTO gochati_phone_bans(phone,reason,admin_id) VALUES($1,$2,$3) ON CONFLICT(phone) DO UPDATE SET reason=$2,admin_id=$3",
              [phone, reason, user.id],
            );
            await client.query(
              "UPDATE gochati_users SET account_status='banned' WHERE gochati_normalize_phone(phone)=$1",
              [phone],
            );
          } else await client.query("DELETE FROM gochati_phone_bans WHERE phone=$1", [phone]);
          await client.query(
            "INSERT INTO gochati_admin_audit(admin_id,action,target_id,changes) VALUES($1,$2,$3,$4)",
            [user.id, action + "_phone", phone, JSON.stringify({ reason })],
          );
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
        return json({ ok: true });
      }
      if (action === "push-key") {
        const keys = await pushKeys();
        return json({ publicKey: keys["public_key"] });
      }
      const sub = body.subscription;
      assert(
        sub &&
          typeof sub.endpoint === "string" &&
          sub.endpoint.length < 4096 &&
          validPushEndpoint(sub.endpoint),
        400,
        "Push subscription si sahihi.",
      );
      if (action === "unsubscribe") {
        await db.sql`DELETE FROM gochati_push_subscriptions WHERE endpoint=${sub.endpoint} AND admin_id=${user.id}`;
      } else {
        assert(
          /^[\w-]{80,100}$/.test(String(sub.keys?.p256dh || "")) &&
            /^[\w-]{20,30}$/.test(String(sub.keys?.["auth"] || "")),
          400,
          "Push keys si sahihi.",
        );
        // An endpoint belongs to one browser; no subscription payload is returned to clients.
        await db.sql`INSERT INTO gochati_push_subscriptions(admin_id,endpoint,subscription) VALUES(${user.id},${sub.endpoint},${JSON.stringify(sub)}::jsonb) ON CONFLICT(endpoint) DO UPDATE SET admin_id=EXCLUDED.admin_id,subscription=EXCLUDED.subscription`;
      }
      return json({ ok: true });
    }
    const target = String(isAdmin ? body.user_id || user.id : user.id);
    if (action === "status") {
      const active =
        isAdmin || (profile["account_status"] === "active");
      const [counts] = active
        ? await db.sql`SELECT count(*)::int AS unread FROM gochati_support_messages WHERE user_id=${user.id} AND sender='admin' AND read_at IS NULL`
        : [];
      return json({ active, unread: Number(counts?.["unread"] || 0) });
    }
    await canChat(target, action === "messages");
    if (action === "messages") {
      const before = body.before ? String(body.before) : null;
      assert(!before || !Number.isNaN(Date.parse(before)), 400, "Tarehe si sahihi.");
      const messages = before
        ? await db.sql`SELECT id,sender,body,kind,mime,created_at,read_at FROM gochati_support_messages WHERE user_id=${target} AND created_at<${before}::timestamptz ORDER BY created_at DESC,id DESC LIMIT 50`
        : await db.sql`SELECT id,sender,body,kind,mime,created_at,read_at FROM gochati_support_messages WHERE user_id=${target} ORDER BY created_at DESC,id DESC LIMIT 50`;
      // Opening the conversation acknowledges its history, including replies beyond page one.
      // The newest fetched timestamp keeps later arrivals unread until the next refresh.
      if (!before && body.mark_read !== false && messages.length)
        await db.sql`UPDATE gochati_support_messages SET read_at=now() WHERE user_id=${target} AND created_at<=${messages[0]!["created_at"]}::timestamptz AND sender=${isAdmin ? "user" : "admin"} AND read_at IS NULL`;
      return json({ data: messages.reverse() });
    }
    assert(action === "send", 400, "Ombi si sahihi.");
    const text = String(body.message || "").trim();
    assert(text.length > 0 && text.length <= 4000, 400, "Andika ujumbe wa herufi 1–4000.");
    await rateLimit();
    await db.sql`INSERT INTO gochati_support_messages(user_id,sender_id,sender,body) VALUES(${target},${user.id},${isAdmin ? "admin" : "user"},${text})`;
    context.waitUntil(deliverAdminPush().catch(() => {}));
    return json({ ok: true }, 201);

    async function canChat(target: string, reading = false) {
      assert(/^[\da-f-]{36}$/i.test(target), 400, "Akaunti si sahihi.");
      assert(isAdmin || target === user.id, 403, "Huna ruhusa.");
      const [account] =
        await db.sql`SELECT account_status,activation_paid FROM gochati_users WHERE id=${target}`;
      assert(
        account &&
          ((isAdmin && reading) ||
            (account["account_status"] === "active")),
        403,
        "Chat inahitaji akaunti active. Tumia namba ya customer service.",
      );
    }
    async function rateLimit() {
      const [limit] =
        await db.sql`INSERT INTO gochati_auth_limits(bucket,expires_at) VALUES(${"support:" + user.id},now()+interval '1 minute') ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN gochati_auth_limits.expires_at<now() THEN 1 ELSE gochati_auth_limits.attempts+1 END,expires_at=CASE WHEN gochati_auth_limits.expires_at<now() THEN now()+interval '1 minute' ELSE gochati_auth_limits.expires_at END RETURNING attempts`;
      assert(Number(limit?.["attempts"]) <= 30, 429, "Subiri dakika moja kabla ya kutuma tena.");
    }
  } catch (error) {
    return fail(error);
  }
};
export const config: Config = { path: "/api/gochati-support" };
