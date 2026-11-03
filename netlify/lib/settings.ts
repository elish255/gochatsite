import type { getDatabase } from "@netlify/database";

export async function getActivationFee(db: ReturnType<typeof getDatabase>) {
  const [settings] = await db.sql`SELECT activation_fee FROM gochati_settings WHERE id=true`;
  const fee = Number(settings?.["activation_fee"]);
  if (!Number.isSafeInteger(fee) || fee < 1 || fee > 10000000)
    throw new Error("Activation fee unavailable");
  return fee;
}
