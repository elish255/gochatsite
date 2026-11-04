import type { Config } from "@netlify/functions";
import { json } from "../lib/platform.js";

export default async () => json({ message: "Akaunti inakuwa active moja kwa moja baada ya usajili." }, 410);
export const config: Config = { path: "/api/gochati-settings" };
