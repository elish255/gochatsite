import { createClient } from "@supabase/supabase-js";

const send = (res: any, status: number, body: Record<string, unknown>) => res.status(status).json(body);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return send(res, 405, { message: "Method not allowed." });
  try {
    const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
    const anonKey = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_ANON_KEY"] || process.env["VITE_SUPABASE_ANON_KEY"];
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!url || !anonKey || !serviceKey) {
      console.error("Gochati login API is missing Supabase environment variables", { url: !!url, anonKey: !!anonKey, serviceKey: !!serviceKey });
      return send(res, 500, { message: "Huduma ya kuingia haijawekwa sawa. Tafadhali wasiliana na huduma kwa wateja." });
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!/^[a-z0-9_]{3,30}$/.test(username) || password.length < 6) {
      return send(res, 400, { message: "Weka username sahihi na password yenye angalau herufi/namba 6." });
    }
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error } = await admin.from("gochati_users").select("email").ilike("username", username).maybeSingle();
    if (error) {
      console.error("Gochati username lookup failed", error.message);
      return send(res, 500, { message: "Imeshindikana kutafuta username kwenye database. Tafadhali jaribu tena." });
    }
    if (!profile?.email) return send(res, 401, { message: "Username au password si sahihi. Hakikisha unatumia username uliyosajili." });
    const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: profile.email, password }),
    });
    const session = await authResponse.json().catch(() => ({}));
    if (!authResponse.ok || !session?.access_token || !session?.refresh_token) {
      console.error("Gochati Supabase password sign-in failed", authResponse.status, session?.msg || session?.message || session?.error_description || session?.error || "unknown error");
      return send(res, 401, { message: "Username au password si sahihi. Tumia password ile ile uliyoweka wakati wa usajili." });
    }
    return send(res, 200, { access_token: session.access_token, refresh_token: session.refresh_token, expires_in: session.expires_in, token_type: session.token_type });
  } catch (error) {
    console.error("Gochati username login API error", error);
    return send(res, 500, { message: "Imeshindikana kuingia kwa sasa. Jaribu tena." });
  }
}
