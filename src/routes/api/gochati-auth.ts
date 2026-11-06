import { createFileRoute } from "@tanstack/react-router";

/**
 * Supabase Edge Function proxy. This route intentionally contains no Netlify
 * imports; authentication logic and privileged database access live in the
 * deployed Supabase Edge Function.
 */
export const Route = createFileRoute("/api/gochati-auth")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const anonKey =
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_ANON_KEY ||
          process.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !anonKey) {
          return Response.json(
            { message: "Huduma ya usajili haijawekwa sawa. Tafadhali jaribu tena baadaye." },
            { status: 503 },
          );
        }

        try {
          const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/gochati-auth`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: anonKey,
              Authorization: request.headers.get("Authorization") || `Bearer ${anonKey}`,
            },
            body: await request.text(),
          });
          const body = await response.text();
          return new Response(body, {
            status: response.status,
            headers: { "Content-Type": response.headers.get("Content-Type") || "application/json" },
          });
        } catch (error) {
          console.error("Supabase auth function request failed", error);
          return Response.json(
            { message: "Huduma ya usajili haipatikani kwa sasa. Jaribu tena." },
            { status: 502 },
          );
        }
      },
    },
  },
});
