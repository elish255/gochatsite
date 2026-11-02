import { getDatabase } from "@netlify/database";
import webpush from "web-push";
import { assert } from "./platform.js";
import { validPushEndpoint } from "./customer-care.js";

export async function pushKeys() {
  const db = getDatabase();
  let [row] = await db.sql`SELECT public_key,private_key FROM gochati_push_config WHERE id=1`;
  if (!row) {
    const keys = webpush.generateVAPIDKeys();
    await db.sql`INSERT INTO gochati_push_config(id,public_key,private_key) VALUES(1,${keys["publicKey"]},${keys["privateKey"]}) ON CONFLICT DO NOTHING`;
    [row] = await db.sql`SELECT public_key,private_key FROM gochati_push_config WHERE id=1`;
  }
  assert(row, 503, "Push haijapatikana. Jaribu tena.");
  return row;
}
export async function deliverAdminPush() {
  const db = getDatabase();
  const pending =
    await db.sql`UPDATE gochati_push_deliveries d SET attempts=attempts+1,next_attempt_at=now()+interval '5 minutes'
    WHERE (event_id,subscription_id) IN (SELECT event_id,subscription_id FROM gochati_push_deliveries WHERE delivered_at IS NULL AND attempts<5 AND next_attempt_at<=now() ORDER BY event_id LIMIT 40 FOR UPDATE SKIP LOCKED)
    RETURNING event_id,subscription_id`;
  if (!pending.length) return;
  const keys = await pushKeys();
  await Promise.allSettled(
    pending.map(async (delivery) => {
      const [item] =
        await db.sql`SELECT e.kind,s.subscription,s.endpoint FROM gochati_admin_events e JOIN gochati_push_subscriptions s ON s.id=${delivery["subscription_id"]}
      JOIN gochati_users u ON u.id=s.admin_id JOIN gochati_admins a ON a.user_id=u.id JOIN gochati_admin_emails ae ON ae.email=u.email WHERE e.id=${delivery["event_id"]}`;
      if (!item || !validPushEndpoint(String(item["endpoint"]))) {
        await db.sql`DELETE FROM gochati_push_deliveries WHERE event_id=${delivery["event_id"]} AND subscription_id=${delivery["subscription_id"]}`;
        return;
      }
      try {
        await webpush.sendNotification(
          item["subscription"] as webpush.PushSubscription,
          JSON.stringify({
            title: "Gochati · Admin",
            body:
              item["kind"] === "registration"
                ? "Mtumiaji mpya amejisajili."
                : "Ujumbe mpya wa customer care.",
            tag: `gochati-${delivery["event_id"]}`,
            url: "/admin?customer-care=1",
          }),
          {
            TTL: 86400,
            timeout: 10000,
            vapidDetails: {
              subject: "https://gochati.online",
              publicKey: String(keys["public_key"]),
              privateKey: String(keys["private_key"]),
            },
          },
        );
        await db.sql`UPDATE gochati_push_deliveries SET delivered_at=now() WHERE event_id=${delivery["event_id"]} AND subscription_id=${delivery["subscription_id"]}`;
      } catch (error) {
        if ([404, 410].includes(Number((error as { statusCode?: number }).statusCode)))
          await db.sql`DELETE FROM gochati_push_subscriptions WHERE id=${delivery["subscription_id"]}`;
      }
    }),
  );
}
