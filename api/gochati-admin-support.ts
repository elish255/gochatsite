import { createClient } from "@supabase/supabase-js";

type Request = {
  method?: string;
  headers: { authorization?: string | string[] };
  body?: unknown;
};

type Response = {
  status: (code: number) => Response;
  json: (body: unknown) => void;
};

const supabaseUrl = process.env["SUPABASE_URL"] || process.env["NEXT_PUBLIC_SUPABASE_URL"] || "";
const anonKey =
  process.env["SUPABASE_PUBLISHABLE_KEY"] ||
  process.env["SUPABASE_ANON_KEY"] ||
  process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ||
  process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ||
  "";
const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";

const authClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function sendError(res: Response, status: number, message: string) {
  return res.status(status).json({ message });
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") return sendError(res, 405, "Method not allowed.");

  const authorization = req.headers["authorization"];
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  const accessToken = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!accessToken) return sendError(res, 401, "Hujaingia.");

  const {
    data: { user: adminUser },
    error: authError,
  } = await authClient.auth.getUser(accessToken);

  if (authError || !adminUser) return sendError(res, 401, "Session ya Admin haijathibitishwa.");

  const { data: admin, error: adminError } = await adminClient
    .from("gochati_admins")
    .select("user_id")
    .eq("user_id", adminUser.id)
    .maybeSingle();

  if (adminError || !admin) return sendError(res, 403, "Ruhusa ya Admin inahitajika.");

  const body = typeof req.body === "object" && req.body !== null
    ? (req.body as Record<string, unknown>)
    : {};
  const requestedTargetUserId = body["targetUserId"];
  const targetUserId = typeof requestedTargetUserId === "string" ? requestedTargetUserId.trim() : "";

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetUserId)) {
    return sendError(res, 400, "Mtumiaji hajachaguliwa kwa usahihi.");
  }

  const { error: auditError } = await adminClient.from("gochati_admin_support_audit").insert({
    admin_id: adminUser.id,
    target_user_id: targetUserId,
  });

  if (auditError) return sendError(res, 500, "Imeshindwa kuhifadhi kumbukumbu ya support view.");

  const { data: profile, error: profileError } = await adminClient
    .from("gochati_users")
    .select(
      "id,username,full_name,country,account_status,activation_paid,is_premium,is_vip,vip_tax_paid,balance,created_at",
    )
    .eq("id", targetUserId)
    .maybeSingle();

  if (profileError) return sendError(res, 500, "Imeshindwa kupakia dashboard ya mtumiaji.");
  if (!profile) return sendError(res, 404, "Akaunti ya mtumiaji haijapatikana.");

  const { data: withdrawals, error: withdrawalsError } = await adminClient
    .from("gochati_withdrawals")
    .select("id,amount,net_amount,status,created_at")
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (withdrawalsError) return sendError(res, 500, "Imeshindwa kupakia historia ya withdrawal.");

  return res.status(200).json({ profile, withdrawals: withdrawals ?? [] });
}
