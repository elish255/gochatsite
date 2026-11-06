import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return reply({ message: "Method not allowed." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!url || !anonKey || !serviceKey) return reply({ message: "Supabase auth configuration is missing." }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!/^[a-z0-9_]{3,30}$/.test(username) || password.length < 6 || password.length > 256) {
    return reply({ message: "Weka username sahihi na password yenye angalau herufi/namba 6." }, 400);
  }

  if (action === "login") {
    const { data: profile, error } = await admin.from("gochati_users").select("email").ilike("username", username).maybeSingle();
    if (error || !profile?.email) return reply({ message: "Username au password si sahihi." }, 401);
    const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error: signInError } = await auth.auth.signInWithPassword({ email: profile.email, password });
    if (signInError || !data.session) return reply({ message: "Username au password si sahihi." }, 401);
    return reply({ data: { session: data.session } });
  }

  if (action === "register") {
    const email = String(body.email || "").trim().toLowerCase();
    const metadata = body.metadata || {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.agree_terms !== true || !String(metadata.full_name || "").trim() || !String(metadata.phone || "").trim()) {
      return reply({ message: "Jaza taarifa zote zinazohitajika na ukubali masharti." }, 400);
    }
    const { data: existing, error: lookupError } = await admin.from("gochati_users").select("id").or(`username.eq.${username},email.eq.${email}`).limit(1);
    if (lookupError) return reply({ message: "Imeshindikana kuhakiki taarifa zako." }, 500);
    if (existing?.length) return reply({ message: "Username au email tayari inatumika." }, 409);

    const publicAuth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: signup, error: signupError } = await publicAuth.auth.signUp({
      email,
      password,
      options: { data: { username, full_name: String(metadata.full_name).trim(), phone: String(metadata.phone).trim(), country: String(metadata.country || ""), referral_username: String(metadata.referral_username || "").trim().toLowerCase() || null } },
    });
    if (signupError || !signup.user) return reply({ message: signupError?.message || "Usajili umeshindwa." }, 400);

    // The auth.users trigger normally creates this profile. Upsert makes this
    // safe when the trigger has already run, while still repairing a missing row.
    const { error: insertError } = await admin.from("gochati_users").upsert({
      id: signup.user.id,
      email,
      username,
      full_name: String(metadata.full_name).trim(),
      phone: String(metadata.phone).trim(),
      country: String(metadata.country || ""),
      account_status: "pending",
      activation_paid: false,
    }, { onConflict: "id" });
    if (insertError) {
      await admin.auth.admin.deleteUser(signup.user.id);
      return reply({ message: "Imeshindikana kuhifadhi akaunti. Hakikisha migrations za GoChati zimewekwa." }, 500);
    }
    return reply({ data: { user: signup.user, session: signup.session } }, 200);
  }
  return reply({ message: "Ombi halijatambulika." }, 400);
});
