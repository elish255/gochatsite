import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(
  url ?? "https://supabase.invalid",
  secretKey ?? "missing-supabase-secret",
  {
  auth: { autoRefreshToken: false, persistSession: false },
});

export function accessToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}
