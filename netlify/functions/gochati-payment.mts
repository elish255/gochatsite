import { randomUUID } from "node:crypto";
import type { Config } from "@netlify/functions";
import { authenticated, assert, checkRequest, fail, json } from "../lib/platform.js";
import { verifiedPaymentStatus } from "../lib/payments.js";

export default async (req: Request) => {
  try {
    checkRequest(req);
    const { db, user, profile, isAdmin } = await authenticated(req);
    const b = await req.json();
    const apiKey = Netlify.env.get("SPLASHPAY_API_KEY"),
      secret = Netlify.env.get("SPLASHPAY_API_SECRET");
    assert(apiKey && secret, 503, "SplashPay haijasanidiwa. Wasiliana na admin.");
    const call = async (path: string, body: unknown, reference?: string) => {
      const response = await fetch(`https://api.splashpay.co.tz/api/v1${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-KEY": apiKey,
          "X-API-SECRET": secret,
          ...(reference ? { "Idempotency-Key": reference } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json().catch(() => null);
      assert(
        response.ok && data?.status === "success",
        502,
        "SplashPay haijathibitisha ombi. Kagua hali kabla ya kujaribu tena.",
      );
      return data.data;
    };
    if (b.action === "create") {
      assert(
        !["banned", "deactivated"].includes(String(profile["account_status"])),
        403,
        "Akaunti imesimamishwa.",
      );
      const prices: Record<string, number> = { activation: 16000, premium: 32000, vip: 35500 };
      const purpose = String(b.purpose),
        amount = prices[purpose];
      assert(amount && Number(b.amount) === amount, 400, "Ada si sahihi.");
      const phone = String(b.phone || "").replace(/\D/g, "");
      assert(/^255\d{9}$/.test(phone), 400, "Weka simu sahihi ya Tanzania.");
      assert(
        !(purpose === "activation"
          ? profile["activation_paid"]
          : purpose === "premium"
            ? profile["is_premium"]
            : profile["is_vip"]),
        409,
        "Huduma hii tayari imewashwa.",
      );
      const [payment] =
        await db.sql`INSERT INTO gochati_payments(user_id,order_id,amount,phone,purpose) VALUES(${user.id},${`INV-${randomUUID()}`},${amount},${phone},${purpose}) ON CONFLICT(user_id,purpose) WHERE status IN ('pending','unknown') DO UPDATE SET user_id=EXCLUDED.user_id RETURNING *`;
      assert(payment, 500, "Malipo hayajahifadhiwa.");
      // Reusing the stored reference makes retries safe even after an ambiguous timeout.
      try {
        const result = await call(
          "/payments/mobile-money",
          {
            amount: payment["amount"],
            currency: "TZS",
            reference: payment["order_id"],
            phone: payment["phone"],
            customer_name: profile["full_name"] || profile["username"],
            customer_email: user.email,
            metadata: { user_id: user.id, purpose },
          },
          payment["order_id"],
        );
        if (result)
          await db.sql`UPDATE gochati_payments SET provider_reference=${String(result.provider_reference || result.transaction_reference || result.id || "")} WHERE id=${payment["id"]}`;
      } catch {
        await db.sql`UPDATE gochati_payments SET status='unknown' WHERE id=${payment["id"]} AND status='pending'`;
        return json({
          reference: payment["order_id"],
          payment_status: "pending",
          message: "Kagua hali ya ombi hili; usianzishe malipo mengine.",
        });
      }
      // Creation responses never activate accounts. A separate verified status request does.
      return json({ reference: payment["order_id"], payment_status: "pending" });
    }
    assert(b.action === "status", 400, "Ombi halijatambulika.");
    const reference = String(b.reference || "");
    assert(/^INV-[a-f0-9-]{36}$/.test(reference), 400, "Reference si sahihi.");
    const [payment] =
      await db.sql`SELECT * FROM gochati_payments WHERE order_id=${reference} AND (user_id=${user.id} OR ${isAdmin})`;
    assert(payment, 404, "Malipo hayajapatikana.");
    if (payment["status"] === "success") return json({ reference, payment_status: "success" });
    const data = await call("/payments/check-status", { reference });
    const status = verifiedPaymentStatus(
      { order_id: String(payment["order_id"]), amount: Number(payment["amount"]) },
      data,
    );
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query("SELECT * FROM gochati_payments WHERE id=$1 FOR UPDATE", [
        payment["id"],
      ]);
      if (rows[0].status !== "success") {
        await client.query(
          "UPDATE gochati_payments SET status=$1,provider_reference=$2,completed_at=CASE WHEN $1='success' THEN now() ELSE completed_at END WHERE id=$3",
          [status, String(data.provider_reference || ""), payment["id"]],
        );
        if (status === "success") {
          const column =
            payment["purpose"] === "vip"
              ? "is_vip"
              : payment["purpose"] === "premium"
                ? "is_premium"
                : "activation_paid";
          await client.query(
            `UPDATE gochati_users SET "${column}"=true,${payment["purpose"] === "activation" ? "account_status=CASE WHEN account_status='pending' THEN 'active' ELSE account_status END," : ""}updated_at=now() WHERE id=$1`,
            [payment["user_id"]],
          );
        }
        if (isAdmin)
          await client.query(
            "INSERT INTO gochati_admin_audit(admin_id,action,target_id,changes) VALUES($1,$2,$3,$4)",
            [user.id, "verify_payment", payment["id"], JSON.stringify({ status })],
          );
      }
      await client.query("COMMIT");
      return json({ reference, payment_status: rows[0].status === "success" ? "success" : status });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    return fail(error);
  }
};
export const config: Config = { path: "/api/gochati-payment" };
