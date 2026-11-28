import { activationFeeEnabled } from "../src/lib/server/activation-policy.js";

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
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const authClient = createClient(supabaseUrl, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const SPRINGTECH_ENDPOINT = "https://sms.springtech.co.tz/api/v1/vendor/message/send";

function normalizeTanzaniaPhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (/^255[67]\d{8}$/.test(digits)) return `+${digits}`;
  if (/^0[67]\d{8}$/.test(digits)) return `+255${digits.slice(1)}`;
  if (/^[67]\d{8}$/.test(digits)) return `+255${digits}`;
  return null;
}

async function sendWithdrawalPaidSms(withdrawal: Record<string, unknown>): Promise<boolean> {
  const phone = normalizeTanzaniaPhone(String(withdrawal.phone || ""));
  const apiKey = process.env.SPRINGTECH_API_KEY || "";
  const apiSecret = process.env.SPRINGTECH_API_SECRET || "";
  const senderId = process.env.SPRINGTECH_SENDER_ID || "";
  if (!phone || !apiKey || !apiSecret || !senderId) return false;

  const { data: account, error: accountError } = await adminClient
    .from("gochati_users")
    .select("username")
    .eq("id", String(withdrawal.user_id || ""))
    .maybeSingle();
  if (accountError) {
    console.error("Withdrawal SMS username lookup failed", accountError);
    return false;
  }

  const amount = Number(withdrawal.amount || 0).toLocaleString("en-US");
  const username = account?.username || "";
  const message = `Hongera ${username} Withdrawal yako ya TZS ${amount} imekamilika. Utapokea Ujumbe Wa Uthibitisho hivi Punde. Hongera kwa Kuchagua GOCHATI.`;

  try {
    const response = await fetch(SPRINGTECH_ENDPOINT, {
      method: "POST",
      headers: {
        api_key: apiKey,
        api_secret: apiSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ senderId, messageType: "text", message, contacts: phone }),
    });
    const result = (await response.json().catch(() => null)) as { success?: boolean } | null;
    if (!response.ok || result?.success !== true) {
      console.error("SpringTech withdrawal SMS rejected", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("SpringTech withdrawal SMS request failed", error);
    return false;
  }
}

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
  "vip_tax_paid",
  "vip_amount_override",
  "payment_blocked",
  "payment_push_attempts",
  "referral_count",
  "balance",
  "created_at",
];

const allowedFilters: Record<string, string[]> = {
  gochati_admins: ["user_id"],
  gochati_users: ["id"],
  gochati_withdrawals: ["id", "user_id"],
  gochati_payments: ["id"],
  gochati_notifications: ["id", "user_id"],
};

function sendError(
  res: Response,
  status: number,
  message: string,
) {
  return res.status(status).json({ message });
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return sendError(res, 405, "Method not allowed.");
  }

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return sendError(
      res,
      500,
      "Supabase server configuration is missing.",
    );
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
      return sendError(
        res,
        401,
        "Session imeisha. Ingia tena.",
      );
    }

    // Tambua kama mtumiaji ni Admin.
    const { data: admin, error: adminError } = await adminClient
      .from("gochati_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError) throw adminError;

    const isAdmin = !!admin;

    if (!isAdmin) {
      const { data: blockRow, error: blockError } = await adminClient
        .from("gochati_users")
        .select("payment_blocked")
        .eq("id", user.id)
        .maybeSingle();
      if (blockError) throw blockError;
      if (blockRow?.payment_blocked) {
        return sendError(
          res,
          403,
          "Account yako imezuiwa, Mtafute mtoa huduma kwa Msaada.",
        );
      }
    }

    // Client inayotumia session ya mtumiaji mwenyewe.
    // Inahitajika kwa RPC zinazotumia auth.uid().
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const body = req.body || {};

    if (body.table === "gochati_payment_prices") {
      const filters = body.filters || {};
      const filterEntries = Object.entries(filters);
      if (
        !filters ||
        typeof filters !== "object" ||
        Array.isArray(filters) ||
        filterEntries.some(([column]) => column !== "purpose") ||
        (filters.purpose !== undefined && !["activation", "premium", "vip", "tax"].includes(String(filters.purpose)))
      ) {
        return sendError(res, 400, "Kichujio cha bei si sahihi.");
      }

      if (body.operation === "select") {
        let query: any = adminClient.from("gochati_payment_prices").select("purpose,amount,updated_at");
        if (filters.purpose) query = query.eq("purpose", filters.purpose);
        if (body.one === true) query = query.maybeSingle();
        const { data, error } = await query;
        if (error) throw error;
        return res.status(200).json({ data });
      }

      if (body.operation !== "update" || !isAdmin) {
        return sendError(res, 403, "Admin pekee ndiye anaruhusiwa kubadilisha bei.");
      }
      const amount = body.payload?.amount;
      if (
        !filters.purpose ||
        !Number.isInteger(amount) ||
        amount < 100 ||
        amount > 10000000
      ) {
        return sendError(res, 400, "Weka kiasi sahihi cha malipo.");
      }
      const { data, error } = await adminClient
        .from("gochati_payment_prices")
        .update({ amount, updated_at: new Date().toISOString() })
        .eq("purpose", filters.purpose)
        .select("amount")
        .maybeSingle();
      if (error) throw error;
      return res.status(200).json({ data });
    }

    if (body.table === "gochati_admin_announcements") {
      if (!isAdmin) return sendError(res, 403, "Admin pekee ndiye anaruhusiwa kuona matangazo.");
      const filters = body.filters || {};
      if (
        !filters ||
        typeof filters !== "object" ||
        Array.isArray(filters) ||
        Object.keys(filters).some((column) => column !== "id")
      ) {
        return sendError(res, 400, "Kichujio cha tangazo si sahihi.");
      }

      if (body.operation === "select") {
        let query: any = adminClient
          .from("gochati_admin_announcements")
          .select("id,title,message,audience,status,created_at,sent_at,target_user_id,payment_amount");
        if (filters.id) query = query.eq("id", filters.id);
        if (body.sort?.column === "created_at") {
          query = query.order("created_at", { ascending: body.sort.ascending !== false });
        }
        query = query.limit(Math.max(1, Math.min(Number(body.limit) || 100, 1000)));
        if (body.one === true) query = query.maybeSingle();
        const { data, error } = await query;
        if (error) throw error;
        return res.status(200).json({ data });
      }

      if (body.operation === "insert") {
        const payload = body.payload;
        const allowedAudiences = ["all", "premium", "normal", "active", "inactive"];
        if (
          !payload ||
          typeof payload.title !== "string" ||
          !payload.title.trim() ||
          payload.title.length > 120 ||
          typeof payload.message !== "string" ||
          !payload.message.trim() ||
          payload.message.length > 2000 ||
          !allowedAudiences.includes(String(payload.audience))
        ) {
          return sendError(res, 400, "Taarifa za tangazo si sahihi.");
        }
        const { data, error } = await adminClient
          .from("gochati_admin_announcements")
          .insert({
            title: payload.title.trim(),
            message: payload.message.trim(),
            audience: payload.audience,
            created_by: user.id,
          })
          .select("id")
          .single();
        if (error) throw error;
        return res.status(200).json({ data });
      }

      if (body.operation === "update") {
        const payload = body.payload;
        if (
          !filters.id ||
          !payload ||
          payload.status !== "sent" ||
          typeof payload.sent_at !== "string" ||
          Number.isNaN(Date.parse(payload.sent_at)) ||
          Object.keys(payload).some((key) => !["status", "sent_at"].includes(key))
        ) {
          return sendError(res, 400, "Mabadiliko ya tangazo si sahihi.");
        }
        const { data, error } = await adminClient
          .from("gochati_admin_announcements")
          .update({ status: "sent", sent_at: payload.sent_at })
          .eq("id", filters.id)
          .select("id")
          .maybeSingle();
        if (error) throw error;
        return res.status(200).json({ data });
      }
      return sendError(res, 400, "Operesheni ya tangazo hairuhusiwi.");
    }

    if (body.table === "gochati_activation_settings") {
      if (!isAdmin) return sendError(res, 403, "Admin pekee ndiye anaruhusiwa.");
      if (body.operation === "select") {
        const { data, error } = await adminClient
          .from("gochati_activation_settings")
          .select("enabled")
          .eq("id", true)
          .single();
        if (error) throw error;
        return res.status(200).json({ data });
      }
      if (body.operation !== "update" || typeof body.payload?.enabled !== "boolean") {
        return sendError(res, 400, "Chagua hali sahihi ya Activation Fee.");
      }
      const { data, error } = await adminClient
        .from("gochati_activation_settings")
        .update({
          enabled: body.payload.enabled,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", true)
        .select("enabled")
        .single();
      if (error) throw error;
      return res.status(200).json({ data });
    }

    // RPC zinazokubaliwa.
    if (body.rpc) {
      const args = body.args || {};

      // RPC ya kuanzisha session ya malipo kwa kila exchange.
      if (body.rpc === "gochati_start_exchange_session") {
        const partner = args.p_partner;
        if (typeof partner !== "string" || !/^person-(?:[1-9]|[1-4][0-9]|5[0-2])$/.test(partner)) {
          return sendError(res, 400, "Chat partner si sahihi.");
        }

        const { data, error } = await userClient.rpc("gochati_start_exchange_session", {
          p_partner: partner,
        });
        if (error) {
          console.error("START EXCHANGE SESSION ERROR:", error);
          return sendError(res, 400, error.message);
        }
        return res.status(200).json({ data });
      }

      // RPC ya kuanzisha kipindi cha kulipia chat.
      if (body.rpc === "gochati_start_earning_session") {
        if (
          !args ||
          typeof args !== "object" ||
          Array.isArray(args)
        ) {
          return sendError(
            res,
            400,
            "Taarifa za kipindi si sahihi.",
          );
        }

        const amount = Number(args.p_amount);
        const minutes = Number(args.p_minutes);
        const partner = args.p_partner;

        const allowedSessions = [
          { minutes: 1, amount: 5000 },
          { minutes: 5, amount: 25000 },
          { minutes: 20, amount: 30000 },
          { minutes: 45, amount: 67000 },
          { minutes: 60, amount: 120000 },
          { minutes: 120, amount: 150000 },
        ];

        const validSession = allowedSessions.some(
          (session) =>
            session.minutes === minutes &&
            session.amount === amount,
        );

        if (
          !Number.isInteger(minutes) ||
          !Number.isFinite(amount) ||
          !validSession ||
          typeof partner !== "string" ||
          !partner.trim() ||
          partner.trim().length > 100
        ) {
          return sendError(
            res,
            400,
            "Muda au malipo ya kipindi si sahihi.",
          );
        }

        const { data, error } = await userClient.rpc(
          "gochati_start_earning_session",
          {
            p_amount: amount,
            p_minutes: minutes,
            p_partner: partner.trim(),
          },
        );

        if (error) {
          console.error(
            "START EARNING SESSION ERROR:",
            error,
          );

          return sendError(res, 400, error.message);
        }

        return res.status(200).json({ data });
      }

      // RPC ya kukamilisha kipindi na kuweka mapato ya mtumiaji mwenyewe.
      // Database function hutumia auth.uid(), na huhakikisha kipindi ni chake
      // na muda wake umekwisha kabla ya kuongeza salio.
      if (body.rpc === "gochati_complete_earning_session") {
        const sessionId = String(args.p_session_id || "");
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId);

        if (!isUuid) {
          return sendError(res, 400, "Kitambulisho cha kipindi si sahihi.");
        }

        const { data, error } = await userClient.rpc(
          "gochati_complete_earning_session",
          { p_session_id: sessionId },
        );

        if (error) {
          console.error("COMPLETE EARNING SESSION ERROR:", error);
          return sendError(res, 400, error.message);
        }

        return res.status(200).json({ data });
      }

      // RPC za withdrawal kwa kutumia session ya mtumiaji.
      if (
        body.rpc === "gochati_withdrawal_eligibility" ||
        body.rpc === "gochati_request_withdrawal"
      ) {
        if (
          !args ||
          typeof args !== "object" ||
          Array.isArray(args)
        ) {
          return sendError(res, 400, "Taarifa za RPC si sahihi.");
        }

        const { data, error } = await userClient.rpc(
          body.rpc,
          args,
        );

        if (error) throw error;

        return res.status(200).json({ data });
      }

      // RPC nyingine ni za Admin pekee.
      if (!isAdmin) {
        return sendError(
          res,
          403,
          "Huna ruhusa ya kutumia RPC hii.",
        );
      }

      if (body.rpc === "gochati_send_targeted_announcement") {
        const targetUserId = String(args.p_target_user_id || "");
        const title = String(args.p_title || "").trim();
        const message = String(args.p_message || "").trim();
        const rawAmount = args.p_payment_amount;
        const paymentAmount = rawAmount === null || rawAmount === undefined ? null : Number(rawAmount);
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetUserId) ||
          !title ||
          title.length > 120 ||
          !message ||
          message.length > 2000 ||
          (paymentAmount !== null &&
            (!Number.isInteger(paymentAmount) || paymentAmount < 100 || paymentAmount > 10000000))
        ) {
          return sendError(res, 400, "Taarifa za tangazo binafsi si sahihi.");
        }
        const { data, error } = await userClient.rpc("gochati_send_targeted_announcement", {
          p_target_user_id: targetUserId,
          p_title: title,
          p_message: message,
          p_payment_amount: paymentAmount,
        });
        if (error) throw error;
        return res.status(200).json({ data });
      }

      if (body.rpc === "gochati_admin_adjust_balance") {
        const userId = String(args.user_id || "");
        const delta = Number(args.delta);

        if (
          !userId ||
          !Number.isFinite(delta) ||
          delta === 0 ||
          Math.abs(delta) > 100000000
        ) {
          return sendError(
            res,
            400,
            "Taarifa za balance si sahihi.",
          );
        }

        const { data, error } = await adminClient.rpc(
          "gochati_admin_adjust_balance",
          {
            user_id: userId,
            delta,
          },
        );

        if (error) throw error;

        return res.status(200).json({ data });
      }

      if (body.rpc === "gochati_broadcast") {
        const audience = String(args.audience || "");
        const message = String(args.message || "").trim();

        if (
          ![
            "all",
            "premium",
            "normal",
            "active",
            "inactive",
          ].includes(audience) ||
          !message ||
          message.length > 2000
        ) {
          return sendError(
            res,
            400,
            "Ujumbe au kundi si sahihi.",
          );
        }

        const { data, error } = await adminClient.rpc(
          "gochati_broadcast",
          {
            audience,
            message,
          },
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
          userIds.some(
            (id: unknown) => typeof id !== "string",
          )
        ) {
          return sendError(
            res,
            400,
            "Orodha ya akaunti si sahihi.",
          );
        }

        if (userIds.includes(user.id)) {
          return sendError(
            res,
            400,
            "Huwezi kufuta akaunti yako mwenyewe.",
          );
        }

        const { data, error } = await adminClient.rpc(
          "gochati_admin_delete_users",
          {
            user_ids: userIds,
          },
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

    if (
      table === "gochati_payments" &&
      operation !== "select"
    ) {
      return sendError(
        res,
        403,
        "Malipo hayawezi kubadilishwa hapa.",
      );
    }

    // Notifications support SELECT (owner only), INSERT (admin only),
    // and UPDATE read_at (owner only); each operation is checked below.

    let query: any;

    // =========================
    // SELECT
    // =========================
    if (operation === "select") {
      const columns =
        table === "gochati_admins"
          ? "user_id"
          : table === "gochati_users"
            ? userColumns.join(",")
            : table === "gochati_withdrawals" && isAdmin
              ? "*,account:gochati_users!gochati_withdrawals_user_id_fkey(username,full_name)"
              : "*";

      query = adminClient.from(table).select(columns);

      const filters = body.filters || {};

      if (
        !filters ||
        typeof filters !== "object" ||
        Array.isArray(filters)
      ) {
        return sendError(res, 400, "Kichujio si sahihi.");
      }

      if (!isAdmin) {
        // Mtumiaji wa kawaida anaweza kuona profile yake
        // na withdrawal zake pekee.
        if (
          table !== "gochati_users" &&
          table !== "gochati_withdrawals" &&
          table !== "gochati_notifications"
        ) {
          return sendError(
            res,
            403,
            "Huruhusiwi kuona taarifa hizi.",
          );
        }

        const filterEntries = Object.entries(filters);

        if (table === "gochati_users") {
          if (
            filterEntries.some(
              ([column, value]) =>
                column !== "id" || value !== user.id,
            )
          ) {
            return sendError(
              res,
              403,
              "Huruhusiwi kuona akaunti hii.",
            );
          }

          query = query.eq("id", user.id);
        }

        if (table === "gochati_withdrawals") {
          if (
            filterEntries.some(
              ([column, value]) =>
                column !== "user_id" || value !== user.id,
            )
          ) {
            return sendError(
              res,
              403,
              "Huruhusiwi kuona withdrawal hizi.",
            );
          }

          query = query.eq("user_id", user.id);
        }

        if (table === "gochati_notifications") {
          if (
            filterEntries.length !== 1 ||
            filters.user_id !== user.id
          ) {
            return sendError(
              res,
              403,
              "Huruhusiwi kuona notifications za mtumiaji mwingine.",
            );
          }

          query = query.eq("user_id", user.id);
        }
      } else {
        // Filters za Admin.
        for (const [column, value] of Object.entries(filters)) {
          if (
            !(allowedFilters[table] || []).includes(column)
          ) {
            return sendError(
              res,
              400,
              "Kichujio hakiruhusiwi.",
            );
          }

          query = query.eq(column, value);
        }
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
        const sortColumn = String(
          body.sort.column || "",
        );

        const allowedSort = [
          "created_at",
          "amount",
          "status",
        ];

        if (!allowedSort.includes(sortColumn)) {
          return sendError(
            res,
            400,
            "Mpangilio wa data si sahihi.",
          );
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

    // =========================
    // UPDATE - ADMIN OR OWNER'S NOTIFICATION READ STATUS
    // =========================
    if (operation === "update") {
      const payload = body.payload;

      if (!isAdmin && table === "gochati_notifications") {
        const filters = body.filters || {};
        const filterEntries = Object.entries(filters);
        if (
          !payload ||
          typeof payload !== "object" ||
          Array.isArray(payload) ||
          Object.keys(payload).length !== 1 ||
          typeof payload.read_at !== "string" ||
          Number.isNaN(Date.parse(payload.read_at)) ||
          filterEntries.length !== 1 ||
          typeof filters.id !== "string" ||
          !filters.id
        ) {
          return sendError(res, 400, "Taarifa za notification si sahihi.");
        }

        query = adminClient
          .from("gochati_notifications")
          .update({ read_at: payload.read_at })
          .eq("id", filters.id)
          .eq("user_id", user.id)
          .select("*");
      } else if (!isAdmin) {
        return sendError(
          res,
          403,
          "Huruhusiwi kubadilisha taarifa hizi.",
        );
      }

      if (!isAdmin) {
        // Notification ya mtumiaji mwenyewe imewekewa user_id kwenye query.
      } else {
      const payload = body.payload;

      if (
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload)
      ) {
        return sendError(
          res,
          400,
          "Taarifa za mabadiliko si sahihi.",
        );
      }

      const filters = body.filters || {};

      if (
        !filters ||
        typeof filters !== "object" ||
        Array.isArray(filters)
      ) {
        return sendError(res, 400, "Kichujio si sahihi.");
      }

      if (table === "gochati_users") {
        const allowed = [
          "activation_paid",
          "account_status",
          "is_premium",
          "is_vip",
          "vip_tax_paid",
          "vip_amount_override",
          "payment_blocked",
          "payment_blocked_at",
          "payment_push_attempts",
        ];

        const keys = Object.keys(payload);

        if (
          keys.length === 0 ||
          keys.some((key) => !allowed.includes(key))
        ) {
          return sendError(
            res,
            400,
            "Mabadiliko haya hayaruhusiwi.",
          );
        }

        if (
          payload.account_status !== undefined &&
          ![
            "active",
            "deactivated",
            "banned",
          ].includes(payload.account_status)
        ) {
          return sendError(
            res,
            400,
            "Hali ya akaunti si sahihi.",
          );
        }

        if (
          (payload.payment_blocked_at !== undefined &&
            payload.payment_blocked_at !== null) ||
          (payload.payment_push_attempts !== undefined &&
            payload.payment_push_attempts !== 0)
        ) {
          return sendError(
            res,
            400,
            "Thamani ya mabadiliko si sahihi.",
          );
        }

        const vipOverride = payload.vip_amount_override;
        if (
          vipOverride !== undefined &&
          vipOverride !== null &&
          (!Number.isInteger(vipOverride) || vipOverride < 100 || vipOverride > 10000000)
        ) {
          return sendError(res, 400, "Kiasi cha VIP si sahihi.");
        }

        for (const key of keys) {
          if (
            typeof payload[key] !== "boolean" &&
            key !== "account_status" &&
            key !== "payment_blocked_at" &&
            key !== "payment_push_attempts" &&
            key !== "vip_amount_override"
          ) {
            return sendError(
              res,
              400,
              "Thamani ya mabadiliko si sahihi.",
            );
          }
        }
      } else if (table === "gochati_withdrawals") {
        const keys = Object.keys(payload);

        if (
          keys.length === 0 ||
          keys.some(
            (key) => !["status", "paid_at"].includes(key),
          ) ||
          payload.status !== "paid" ||
          typeof payload.paid_at !== "string"
        ) {
          return sendError(
            res,
            400,
            "Mabadiliko ya withdrawal si sahihi.",
          );
        }
      } else {
        return sendError(
          res,
          403,
          "Mabadiliko haya hayaruhusiwi.",
        );
      }

      const filterEntries = Object.entries(filters);

      if (
        filterEntries.length !== 1 ||
        !(allowedFilters[table] || []).includes(
          filterEntries[0]?.[0],
        )
      ) {
        return sendError(
          res,
          400,
          "Kitambulisho cha taarifa hakipo.",
        );
      }

      query = adminClient.from(table).update(payload);

      if (table === "gochati_withdrawals" && payload.status === "paid") {
        query = query.eq("status", "pending");
      }

      for (const [column, value] of filterEntries) {
        query = query.eq(column, value);
      }

      query = query.select("*");
      if (body.one === true) query = query.maybeSingle();
      }
    }

    // =========================
    // INSERT - ADMIN PEKEE
    // =========================
    if (operation === "insert") {
      if (!isAdmin) {
        return sendError(
          res,
          403,
          "Huruhusiwi kuingiza taarifa hizi.",
        );
      }

      if (table !== "gochati_notifications") {
        return sendError(
          res,
          403,
          "Insert hairuhusiwi.",
        );
      }

      const payload = body.payload;

      if (
        !payload ||
        typeof payload.user_id !== "string" ||
        typeof payload.message !== "string" ||
        !payload.message.trim() ||
        payload.message.length > 2000
      ) {
        return sendError(
          res,
          400,
          "Notification si sahihi.",
        );
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

    const withdrawalSmsStatuses: Record<string, "queued" | "failed"> = {};
    if (
      table === "gochati_withdrawals" &&
      operation === "update" &&
      isAdmin &&
      body.payload?.status === "paid" &&
      Array.isArray(data)
    ) {
      for (const withdrawal of data as Record<string, unknown>[]) {
        const sent = await sendWithdrawalPaidSms(withdrawal);
        withdrawalSmsStatuses[String(withdrawal.id)] = sent ? "queued" : "failed";
      }
    }

    const responseData =
      table === "gochati_withdrawals" && isAdmin && Array.isArray(data)
        ? data.map((withdrawal: Record<string, unknown>) => {
            const relatedAccount = withdrawal.account;
            const account = Array.isArray(relatedAccount)
              ? relatedAccount[0]
              : relatedAccount;
            const profile =
              typeof account === "object" && account !== null
                ? (account as {
                    username?: string | null;
                    full_name?: string | null;
                  })
                : undefined;
            const { account: _account, ...fields } = withdrawal;

            return {
              ...fields,
              username: profile?.username ?? null,
              full_name: profile?.full_name ?? null,
              ...(withdrawalSmsStatuses[String(withdrawal.id)]
                ? { sms_status: withdrawalSmsStatuses[String(withdrawal.id)] }
                : {}),
            };
          })
        : data;

    if (table === "gochati_users" && operation === "select" && data) {
      const enabled = await activationFeeEnabled(adminClient);
      const withPolicy = (profile: Record<string, unknown>) => ({
        ...profile,
        activation_fee_enabled: enabled,
      });
      return res
        .status(200)
        .json({ data: Array.isArray(data) ? data.map(withPolicy) : withPolicy(data) });
    }

    return res.status(200).json({ data: responseData });
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
