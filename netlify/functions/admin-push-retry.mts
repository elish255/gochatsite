import type { Config } from "@netlify/functions";
import { deliverAdminPush } from "../lib/admin-push.js";
export default async () => {
  await deliverAdminPush();
};
export const config: Config = { schedule: "* * * * *" };
