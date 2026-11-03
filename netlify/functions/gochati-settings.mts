import { getDatabase } from "@netlify/database";
import type { Config } from "@netlify/functions";
import { authenticated, assert, checkRequest, fail, json } from "../lib/platform.js";
import { getActivationFee } from "../lib/settings.js";

export default async (req: Request) => {
  try {
    if (req.method === "GET")
      return json({ activation_fee: await getActivationFee(getDatabase()) });
    checkRequest(req);
    const { db, user, isAdmin } = await authenticated(req);
    assert(isAdmin, 403, "Admin pekee.");
    const body = await req.json();
    const fee = body.activation_fee;
    assert(typeof fee === "number" && Number.isSafeInteger(fee) && fee >= 1 && fee <= 10000000,
      400, "Weka kiasi kamili kati ya TZS 1 na 10,000,000.");
    await db.sql`WITH changed AS (
      UPDATE gochati_settings SET activation_fee=${fee},updated_at=now() WHERE id=true RETURNING activation_fee
    ) INSERT INTO gochati_admin_audit(admin_id,action,changes)
      SELECT ${user.id},'update_activation_fee',jsonb_build_object('activation_fee',activation_fee) FROM changed`;
    return json({ activation_fee: fee });
  } catch (error) { return fail(error); }
};
export const config: Config = { path: "/api/gochati-settings" };
