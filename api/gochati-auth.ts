/** Vercel Serverless Function for POST /api/gochati-auth. */
type VercelRequest = { method?: string; body?: unknown; headers: Record<string, string | string[] | undefined> };
type VercelResponse = { status(code: number): VercelResponse; json(body: unknown): void; send(body: string): void; setHeader(name: string, value: string): void };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ message: "Method not allowed." }); }
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return res.status(503).json({ message: "Huduma ya usajili haijawekwa sawa. Tafadhali jaribu tena baadaye." });
  try {
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    const auth = req.headers.authorization;
    const authorization = Array.isArray(auth) ? auth[0] : auth;
    const upstream = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/gochati-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey, Authorization: authorization || `Bearer ${anonKey}` },
      body,
    });
    const responseBody = await upstream.text();
    res.setHeader("Content-Type", upstream.headers.get("Content-Type") || "application/json");
    return res.status(upstream.status).send(responseBody);
  } catch (error) {
    console.error("Gochati auth proxy failed:", error);
    return res.status(502).json({ message: "Huduma ya usajili haipatikani kwa sasa. Jaribu tena." });
  }
}
