import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/gochati-login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
          const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          if (!url || !anonKey || !serviceKey) return json({ message: "Login service is not configured." }, 500);

          const body = await request.json().catch(() => ({}));
          const username = String(body?.username || "").trim().toLowerCase();
          const password = String(body?.password || "");
          if (!/^[a-z0-9_]{3,30}$/.test(username) || password.length < 4) {
            return json({ message: "Username au password si sahihi." }, 400);
          }

          const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
          const { data: profile, error } = await admin
            .from("gochati_users")
            .select("email")
            .ilike("username", username)
            .maybeSingle();
          if (error) {
            console.error("Gochati username lookup failed", error.message);
            return json({ message: "Imeshindikana kuthibitisha akaunti. Jaribu tena." }, 500);
          }
          if (!profile?.email) return json({ message: "Username au password si sahihi." }, 401);

          const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
            method: "POST",
            headers: { apikey: anonKey, "Content-Type": "application/json" },
            body: JSON.stringify({ email: profile.email, password }),
          });
          const session = await authResponse.json().catch(() => ({}));
          if (!authResponse.ok || !session?.access_token || !session?.refresh_token) {
            return json({ message: "Username au password si sahihi." }, 401);
          }
          return json({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: session.expires_in,
            token_type: session.token_type,
          });
        } catch (error) {
          console.error("Gochati username login failed", error);
          return json({ message: "Imeshindikana kuingia kwa sasa. Jaribu tena." }, 500);
        }
      },
    },
  },
});
