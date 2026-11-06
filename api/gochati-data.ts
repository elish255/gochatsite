
import { createClient } from "@supabase/supabase-js";

type Request = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: any;
};

type Response = {
  status: (code: number) => Response;
  json: (data: unknown) => void;
};

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const authClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const userColumns = [
  "id",
  "full_name",
  "username",
  "phone",
  "country",
  "email",
  "account_status",
  "activation_paid",
  "is_premium",
  "is_vip",
  "referral_count",
  "balance",
  "created_at",
];

const allowedFilters: Record<string, string[]> = {
  gochati_admins: ["user_id"],
  gochati_users: ["id"],
  gochati_withdrawals: ["id"],
  gochati_payments: ["id"],
};

function sendError(res: Response, status: number, message: string) {
  return res.status(status).json({ message });
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return sendError(res, 405, "Method not allowed.");
  }

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return sendError(res, 500, "Supabase server configuration is missing.");
  }

  try {
    const authorization = req.headers.authorization;
    const token = Array.isArray(authorization)
      ? authorization[0]
      : authorization;

    if (!token || !token.startsWith("Bearer ")) {
      return sendError(res, 401, "Hujaingia.");
    }

    const accessToken = token.slice(7);

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(accessToken);

    if (authError || !user) {
      return sendError(res, 401, "Session imeisha. Ingia tena.");
    }

    // Hakikisha mtumiaji ni admin.
    const { data: admin, error: adminError } = await adminClient
      .from("gochati_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError || !admin) {
      return sendError(res, 403, "Huna ruhusa ya kutumia huduma hii.");
    }

    const body = req.body || {};

    // RPC zinazokubaliwa.
    if (body.rpc) {
      const args = body.args || {};

      if (body.rpc === "gochati_admin_adjust_balance") {
        const userId = String(args.user_id || "");
        const delta = Number(args.delta);

        if (
          !userId ||
          !Number.isFinite(delta) ||
          delta === 0 ||
          Math.abs(delta) > 100000000
        ) {
          return sendError(res, 400, "Taarifa za balance si sahihi.");
        }

        const { data, error } = await adminClient.rpc(
          "gochati_admin_adjust_balance",
          { user_id: userId, delta },
        );

        if (error) throw error;
        return res.status(200).json({ data });
      }

      if (body.rpc === "gochati_broadcast") {
        const audience = String(args.audience || "");
        const message = String(args.message || "").trim();

        if (
          !["all", "premium", "normal", "active", "inactive"].includes(audience) ||
          !message ||
          message.length > 2000
        ) {
          return sendError(res, 400, "Ujumbe au kundi si sahihi.");
        }

        const { data, error } = await adminClient.rpc(
          "gochati_broadcast",
          { audience, message },
        );

        if (error) throw error;
        return res.status(200).json({ data });
      }

      if (body.rpc === "gochati_admin_delete_users") {
        const userIds = args.user_ids;

        if (
          !Array.isArray(userIds) ||
          userIds.length === 0 ||
          userIds.length > 100 ||
          userIds.some((id: unknown) => typeof id !== "string")
        ) {
          return sendError(res, 400, "Orodha ya akaunti si sahihi.");
        }

        if (userIds.includes(user.id)) {
          return sendError(res, 400, "Huwezi kufuta akaunti yako mwenyewe.");
        }

        const { data, error } = await adminClient.rpc(
          "gochati_admin_delete_users",
          { user_ids: userIds },
        );

        if (error) throw error;
        return res.status(200).json({ data });
      }

      return sendError(res, 400, "RPC hairuhusiwi.");
    }

    const table = String(body.table || "");
    const operation = String(body.operation || "select");

    const allowedTables = [
      "gochati_admins",
      "gochati_users",
      "gochati_withdrawals",
      "gochati_payments",
      "gochati_notifications",
    ];

    if (!allowedTables.includes(table)) {
      return sendError(res, 400, "Jedwali haliruhusiwi.");
    }

    if (!["select", "insert", "update"].includes(operation)) {
      return sendError(res, 400, "Operesheni hairuhusiwi.");
    }

    if (table === "gochati_admins" && operation !== "select") {
      return sendError(res, 403, "Operesheni hairuhusiwi.");
    }

    if (table === "gochati_payments" && operation !== "select") {
      return sendError(res, 403, "Malipo hayawezi kubadilishwa hapa.");
    }

    if (table === "gochati_notifications" && operation !== "insert") {
      return sendError(res, 403, "Operesheni hairuhusiwi.");
    }

    let query: any;

    if (operation === "select") {
      const columns =
        table === "gochati_admins"
          ? "user_id"
          : table === "gochati_users"
            ? userColumns.join(",")
            : "*";

      query = adminClient.from(table).select(columns);

      const filters = body.filters || {};

      for (const [column, value] of Object.entries(filters)) {
        if (!(allowedFilters[table] || []).includes(column)) {
          return sendError(res, 400, "Kichujio hakiruhusiwi.");
        }

        query = query.eq(column, value);
      }

      if (body.search && table === "gochati_users") {
        const term = String(body.search)
          .trim()
          .slice(0, 100)
          .replace(/[,%()]/g, " ");

        if (term) {
          const pattern = `%${term}%`;
          query = query.or(
            [
              `full_name.ilike.${pattern}`,
              `username.ilike.${pattern}`,
              `phone.ilike.${pattern}`,
              `email.ilike.${pattern}`,
            ].join(","),
          );
        }
      }

      if (body.sort) {
        const sortColumn = String(body.sort.column || "");

        const allowedSort = [
          "created_at",
          "amount",
          "status",
        ];

        if (!allowedSort.includes(sortColumn)) {
          return sendError(res, 400, "Mpangilio wa data si sahihi.");
        }

        query = query.order(sortColumn, {
          ascending: body.sort.ascending === true,
        });
      }

      const limit = Math.max(
        1,
        Math.min(Number(body.limit) || 100, 1000),
      );

      query = query.limit(limit);

      if (body.one === true) {
        query = query.maybeSingle();
      }
    }

    if (operation === "update") {
      const payload = body.payload;

      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return sendError(res, 400, "Taarifa za mabadiliko si sahihi.");
      }

      const filters = body.filters || {};

      if (table === "gochati_users") {
        const allowed = [
          "activation_paid",
          "account_status",
          "is_premium",
          "is_vip",
        ];

        const keys = Object.keys(payload);

        if (
          keys.length === 0 ||
          keys.some((key) => !allowed.includes(key))
        ) {
          return sendError(res, 400, "Mabadiliko haya hayaruhusiwi.");
        }

        if (
          payload.account_status !== undefined &&
          !["active", "deactivated", "banned"].includes(payload.account_status)
        ) {
          return sendError(res, 400, "Hali ya akaunti si sahihi.");
        }

        for (const key of keys) {
          if (typeof payload[key] !== "boolean" && key !== "account_status") {
            return sendError(res, 400, "Thamani ya mabadiliko si sahihi.");
          }
        }
      } else if (table === "gochati_withdrawals") {
        const keys = Object.keys(payload);

        if (
          keys.length === 0 ||
          keys.some((key) => !["status", "paid_at"].includes(key)) ||
          payload.status !== "paid" ||
          typeof payload.paid_at !== "string"
        ) {
          return sendError(res, 400, "Mabadiliko ya withdrawal si sahihi.");
        }
      } else {
        return sendError(res, 403, "Mabadiliko haya hayaruhusiwi.");
      }

      const filterEntries = Object.entries(filters);

      if (
        filterEntries.length !== 1 ||
        !(allowedFilters[table] || []).includes(filterEntries[0][0])
      ) {
        return sendError(res, 400, "Kitambulisho cha taarifa hakipo.");
      }

      query = adminClient.from(table).update(payload);

      for (const [column, value] of filterEntries) {
        query = query.eq(column, value);
      }

      query = query.select("*");
    }

    if (operation === "insert") {
      if (table !== "gochati_notifications") {
        return sendError(res, 403, "Insert hairuhusiwi.");
      }

      const payload = body.payload;

      if (
        !payload ||
        typeof payload.user_id !== "string" ||
        typeof payload.message !== "string" ||
        !payload.message.trim() ||
        payload.message.length > 2000
      ) {
        return sendError(res, 400, "Notification si sahihi.");
      }

      query = adminClient
        .from("gochati_notifications")
        .insert({
          user_id: payload.user_id,
          message: payload.message.trim(),
        })
        .select("*");
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({ data });
  } catch (error) {
    console.error("GOCHATI DATA API ERROR:", error);

    return sendError(
      res,
      500,
      error instanceof Error
        ? error.message
        : "Huduma haipatikani. Jaribu tena.",
    );
  }
}
