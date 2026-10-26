import { authenticated, assert, checkRequest, fail, json } from "../lib/platform.js";
import { sendDarsms } from "../lib/darsms.js";
import type { Config } from "@netlify/functions";

export default async (req: Request) => {
  try {
    checkRequest(req);
    const { db, user, profile, isAdmin } = await authenticated(req);
    const b = await req.json();
    if (b.rpc === "gochati_withdrawal_eligibility") {
      const [counts] =
        await db.sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE activation_paid AND account_status='active')::int AS active FROM gochati_users WHERE referred_by=${user.id}`;
      return json({
        data: {
          is_premium: profile["is_premium"],
          is_vip: profile["is_vip"],
          referrals: counts?.["total"] || 0,
          active_referrals: counts?.["active"] || 0,
        },
      });
    }
    if (b.rpc === "gochati_broadcast") {
      assert(isAdmin, 403, "Admin pekee.");
      const { audience, message } = b.args || {};
      assert(
        ["all", "active", "inactive", "premium", "normal"].includes(audience) &&
          typeof message === "string" &&
          message.trim().length > 0 &&
          message.length <= 2000,
        400,
        "Ujumbe au kundi si sahihi.",
      );
      const conditions: Record<string, string> = {
        all: "true",
        active: "activation_paid AND account_status='active'",
        inactive: "NOT activation_paid",
        premium: "is_premium",
        normal: "NOT is_premium AND NOT is_vip",
      };
      const client = await db.pool.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query(
          `INSERT INTO gochati_notifications(user_id,message) SELECT id,$1 FROM gochati_users WHERE ${conditions[audience]}`,
          [message.trim()],
        );
        await client.query(
          "INSERT INTO gochati_admin_audit(admin_id,action,changes) VALUES($1,'send_notifications',$2)",
          [user.id, JSON.stringify({ audience, count: result.rowCount })],
        );
        await client.query("COMMIT");
        return json({ data: result.rowCount });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    if (b.rpc === "gochati_admin_adjust_balance") {
      assert(isAdmin, 403, "Admin pekee.");
      const { user_id: target, delta } = b.args || {};
      assert(
        typeof target === "string" &&
          Number.isFinite(delta) &&
          delta !== 0 &&
          Math.abs(delta) <= 9999999999,
        400,
        "Kiasi si sahihi.",
      );
      const client = await db.pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query(
          "UPDATE gochati_users SET balance=balance+$1,net_income=net_income+GREATEST($1,0),updated_at=now() WHERE id=$2 AND balance+$1 BETWEEN 0 AND 9999999999 RETURNING balance",
          [delta, target],
        );
        assert(rows[0], 409, "Salio halitoshi au akaunti haijapatikana.");
        await client.query(
          "INSERT INTO gochati_admin_audit(admin_id,action,target_id,changes) VALUES($1,$2,$3,$4)",
          [user.id, "adjust_simulation_balance", target, JSON.stringify({ delta })],
        );
        await client.query("COMMIT");
        return json({ data: rows[0].balance });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    if (b.rpc) {
      assert(
        profile["activation_paid"] && profile["account_status"] === "active",
        403,
        "Akaunti haijawezeshwa.",
      );
      const a = b.args || {};
      if (b.rpc === "gochati_start_earning_session") {
        const amount = Number(a.p_amount),
          minutes = Number(a.p_minutes);
        assert(
          ((minutes === 1 && amount === 5000) || (minutes === 5 && amount === 25000)) &&
            /^person-\d{1,2}$/.test(a.p_partner),
          400,
          "Kipindi si sahihi.",
        );
        const [row] =
          await db.sql`INSERT INTO gochati_earning_sessions(user_id,partner,amount,minutes) VALUES (${user.id},${a.p_partner},${amount},${minutes}) ON CONFLICT(user_id) WHERE completed_at IS NULL DO UPDATE SET partner=EXCLUDED.partner,amount=EXCLUDED.amount,minutes=EXCLUDED.minutes,created_at=now() RETURNING id`;
        assert(row, 500, "Kipindi hakijahifadhiwa.");
        return json({ data: row["id"] });
      }
      if (b.rpc === "gochati_complete_earning_session") {
        const rows =
          await db.sql`WITH completed AS (UPDATE gochati_earning_sessions SET completed_at=now() WHERE id=${a.p_session_id} AND user_id=${user.id} AND completed_at IS NULL AND created_at + minutes * interval '1 minute' <= now() RETURNING amount) UPDATE gochati_users SET balance=balance+(SELECT amount FROM completed), net_income=net_income+(SELECT amount FROM completed), updated_at=now() WHERE id=${user.id} AND EXISTS(SELECT 1 FROM completed) RETURNING balance`;
        if (rows[0]) return json({ data: rows[0]["balance"] });
        const existing =
          await db.sql`SELECT id FROM gochati_earning_sessions WHERE id=${a.p_session_id} AND user_id=${user.id} AND completed_at IS NOT NULL`;
        assert(existing.length, 409, "Kipindi hakijaisha au hakijapatikana.");
        return json({ data: profile["balance"] });
      }
      if (b.rpc === "gochati_request_withdrawal") {
        const amount = Number(a.p_amount),
          phone = String(a.p_phone || "").trim();
        const minAmount = profile["is_premium"] ? 500000 : 100000;
        assert(
          Number.isSafeInteger(amount) && amount >= minAmount,
          400,
          `Minimum withdrawal ni TZS ${minAmount.toLocaleString()}.`,
        );
        assert(/^[+\d ]{9,16}$/.test(phone), 400, "Weka namba sahihi ya simu.");
        const [counts] =
          await db.sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE activation_paid AND account_status='active')::int AS active FROM gochati_users WHERE referred_by=${user.id}`;
        assert(
          profile["is_vip"] ||
            (profile["is_premium"]
              ? Number(counts?.["active"]) >= 5
              : Number(counts?.["total"]) >= 10),
          403,
          profile["is_premium"]
            ? "Alika watu 5 wawe active au upgrade kwenda VIP."
            : "Alika watu 10 au upgrade kwenda Premium.",
        );
        const fee = Math.round(amount * 20) / 100;
        const rows =
          await db.sql`WITH debited AS (UPDATE gochati_users SET balance=balance-${amount} WHERE id=${user.id} AND balance>=${amount} AND account_status='active' AND activation_paid RETURNING id) INSERT INTO gochati_withdrawals(user_id,amount,phone,fee,net_amount,status) SELECT id,${amount},${phone},${fee},${amount - fee},'pending' FROM debited RETURNING id`;
        assert(rows.length, 409, "SALIO HALITOSHI");
        return json({ data: rows[0]?.["id"] });
      }
      assert(false, 400, "Ombi halijatambulika.");
    }
    const tables = [
      "gochati_users",
      "gochati_admins",
      "gochati_notifications",
      "gochati_withdrawals",
      "gochati_payments",
      "chat_messages",
      "gochati_admin_audit",
    ];
    const table = String(b.table);
    assert(tables.includes(table), 400, "Jedwali haliruhusiwi.");
    const filters = b.filters || {},
      values: unknown[] = [],
      clauses: string[] = [];
    const param = (v: unknown) => {
      values.push(v);
      return `$${values.length}`;
    };
    if (!isAdmin)
      clauses.push(
        `${table === "gochati_users" ? "id" : table === "gochati_admin_audit" ? "admin_id" : "user_id"}=${param(user.id)}`,
      );
    for (const [key, value] of Object.entries(filters)) {
      assert(
        ["id", "user_id", "partner_id", "order_id"].includes(key),
        400,
        "Kichujio hakiruhusiwi.",
      );
      clauses.push(`"${key}"=${param(value)}`);
    }
    let query = "";
    if (b.operation === "select") {
      if (b.search) {
        assert(isAdmin && table === "gochati_users", 403, "Admin pekee.");
        assert(typeof b.search === "string" && b.search.length <= 100, 400, "Utafutaji si sahihi.");
        const term = param(`%${b.search.trim().replace(/[\\%_]/g, "\\$&")}%`);
        clauses.push(`(full_name ILIKE ${term} OR username ILIKE ${term} OR phone ILIKE ${term})`);
      }
      assert(table !== "gochati_admin_audit" || isAdmin, 403, "Admin pekee.");
      let order = "created_at DESC";
      if (b.sort) {
        assert(["created_at", "id"].includes(b.sort.column), 400, "Mpangilio si sahihi.");
        order = `"${b.sort.column}" ${b.sort.ascending ? "ASC" : "DESC"}`;
      }
      const limit = Math.min(1000, Math.max(1, Number(b.limit) || 100));
      const columns = table === "gochati_withdrawals" && isAdmin
        ? '*, (SELECT username FROM gochati_users WHERE gochati_users.id = gochati_withdrawals.user_id) AS username'
        : "*";
      query = `SELECT ${columns} FROM "${table}" ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""} ORDER BY ${order} LIMIT ${param(limit)}`;
    } else if (b.operation === "update") {
      assert(clauses.length && (filters.id || filters.user_id), 400, "Chagua rekodi.");
      const p = b.payload || {};
      const allowed =
        table === "gochati_users" && isAdmin
          ? ["account_status", "activation_paid", "is_premium", "is_vip"]
          : table === "gochati_withdrawals" && isAdmin
            ? ["status", "paid_at"]
            : table === "gochati_notifications"
              ? ["read_at"]
              : [];
      assert(
        Object.keys(p).length && Object.keys(p).every((k) => allowed.includes(k)),
        403,
        "Mabadiliko hayaruhusiwi.",
      );
      if (p.balance !== undefined)
        assert(
          Number.isFinite(Number(p.balance)) &&
            Number(p.balance) >= 0 &&
            Number(p.balance) <= 9999999999,
          400,
          "Balance si sahihi.",
        );
      if (p.account_status !== undefined)
        assert(
          ["pending", "active", "banned", "deactivated"].includes(p.account_status),
          400,
          "Hali si sahihi.",
        );
      for (const key of ["activation_paid", "is_premium", "is_vip"])
        if (key in p) assert(typeof p[key] === "boolean", 400, "Thamani si sahihi.");
      if (table === "gochati_withdrawals") {
        assert(p.status === "paid", 400, "Chagua Paid kukamilisha ombi.");
        p.paid_at = new Date().toISOString();
        clauses.push("status='pending'");
      }
      if (table === "gochati_notifications") p.read_at = new Date().toISOString();
      query = `UPDATE "${table}" SET ${Object.entries(p)
        .map(([k, v]) => `"${k}"=${param(v)}`)
        .join(",")} WHERE ${clauses.join(" AND ")} RETURNING *`;
    } else if (b.operation === "insert") {
      if (table === "chat_messages") {
        const p = b.payload;
        assert(
          p.user_id === user.id &&
            p.sender === "user" &&
            typeof p.body === "string" &&
            p.body.length > 0 &&
            p.body.length <= 4000 &&
            typeof p.partner_id === "string" &&
            p.partner_id.length <= 80,
          400,
          "Ujumbe si sahihi.",
        );
        const rows =
          await db.sql`INSERT INTO chat_messages(user_id,partner_id,sender,body) VALUES(${user.id},${p.partner_id},'user',${p.body}) RETURNING *`;
        return json({ data: b.one ? rows[0] : rows });
      }
      assert(table === "gochati_notifications" && isAdmin, 403, "Admin pekee.");
      const payload = Array.isArray(b.payload) ? b.payload : [b.payload];
      assert(payload.length > 0 && payload.length <= 1000, 400, "Chagua wapokeaji.");
      const client = await db.pool.connect();
      try {
        await client.query("BEGIN");
        for (const p of payload) {
          assert(
            typeof p.message === "string" &&
              p.message.trim().length > 0 &&
              p.message.length <= 2000,
            400,
            "Ujumbe si sahihi.",
          );
          await client.query("INSERT INTO gochati_notifications(user_id,message) VALUES($1,$2)", [
            p.user_id,
            p.message.trim(),
          ]);
        }
        await client.query(
          "INSERT INTO gochati_admin_audit(admin_id,action,changes) VALUES($1,$2,$3)",
          [user.id, "send_notifications", JSON.stringify({ count: payload.length })],
        );
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
      return json({ data: [] });
    } else assert(false, 400, "Ombi haliruhusiwi.");
    const client = await db.pool.connect();
    try {
      const mutation = b.operation === "update";
      if (mutation) await client.query("BEGIN");
      const { rows } = await client.query(query, values);
      if (mutation && isAdmin)
        await client.query(
          "INSERT INTO gochati_admin_audit(admin_id,action,target_id,changes) VALUES($1,$2,$3,$4)",
          [
            user.id,
            `update_${table}`,
            String(filters.id || filters.user_id),
            JSON.stringify(b.payload),
          ],
        );
      if (mutation) await client.query("COMMIT");
      if (mutation && table === "gochati_withdrawals") {
        for (const withdrawal of rows) {
          withdrawal.sms_status = "failed";
          try {
            const { rows: recipients } = await client.query(
              "SELECT username FROM gochati_users WHERE id=$1",
              [withdrawal.user_id],
            );
            assert(recipients[0], 404, "Mtumiaji hajapatikana.");
            await sendDarsms(
              String(withdrawal.phone),
              `Hongera! ${recipients[0].username} Withdrawal yako ya TZS ${Number(withdrawal.amount).toLocaleString("en-US")} imekamilika na malipo yako yametumwa kikamilifu. Asante kwa kutumia GOCHATI .!!!`,
            );
            withdrawal.sms_status = "queued";
          } catch {
            // A provider failure must never undo a committed admin status change.
          }
        }
      }
      return json({ data: b.one ? rows[0] || null : rows });
    } catch (e) {
      if (b.operation === "update") await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    return fail(error);
  }
};
export const config: Config = { path: "/api/gochati-data" };
