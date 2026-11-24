import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PresenceRequest = { method?: string; headers?: Record<string, string | undefined> };
type PresenceResponse = {
  status: (code: number) => PresenceResponse;
  json: (body: unknown) => PresenceResponse;
  end: () => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: PresenceRequest, res: PresenceResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed." });
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey)
    return res.status(503).json({ message: "Presence haijawekwa." });

  try {
    const origin = req.headers?.origin;
    const host = String(req.headers?.host || "").toLowerCase();
    if (origin && new URL(origin).host.toLowerCase() !== host)
      return res.status(403).json({ message: "Origin haijaruhusiwa." });

    const cookies = String(req.headers?.cookie || "")
      .split(";")
      .map((item: string) => item.trim());
    const visitorCookie = cookies
      .find((item: string) => item.startsWith("gochati_visitor="))
      ?.slice("gochati_visitor=".length);
    const visitorId =
      visitorCookie && UUID_PATTERN.test(visitorCookie) ? visitorCookie : randomUUID();
    const token = String(req.headers?.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1];
    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const service = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let userId: string | null = null;
    let country: string | null = null;
    if (token) {
      const { data, error } = await authClient.auth.getUser(token);
      if (!error && data.user) {
        userId = data.user.id;
        const { data: profile } = await service
          .from("gochati_users")
          .select("country")
          .eq("id", userId)
          .maybeSingle();
        country = profile?.country || null;
      }
    }

    const { error } = await service.from("gochati_presence_sessions").upsert(
      {
        visitor_id: visitorId,
        ...(userId ? { user_id: userId, country } : {}),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "visitor_id", ignoreDuplicates: false },
    );
    if (error) throw error;

    const secure =
      String(req.headers?.["x-forwarded-proto"] || "https") === "https" ? "; Secure" : "";
    res.setHeader(
      "Set-Cookie",
      `gochati_visitor=${visitorId}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${secure}`,
    );
    return res.status(204).end();
  } catch (error) {
    console.error("Gochati presence recording failed", error);
    return res.status(500).json({ message: "Imeshindikana kuhifadhi presence." });
  }
}
