import { defineEventHandler, getRequestIP, toWebRequest } from "h3";
import handler from "../../netlify/functions/gochati-auth.mts";

export default defineEventHandler(async (event) => {
  const response = await handler(toWebRequest(event), {
    ip: getRequestIP(event, { xForwardedFor: true }) ?? "unknown",
    waitUntil: (promise: Promise<unknown>) => {
      event.waitUntil?.(promise);
    },
  } as never);

  return response;
});
