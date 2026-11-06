import { createFileRoute } from "@tanstack/react-router";
import handler from "../../../netlify/functions/gochati-auth.mts";

export const Route = createFileRoute("/api/gochati-auth")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handler(request, {
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
          waitUntil: () => undefined,
        } as never),
    },
  },
});
