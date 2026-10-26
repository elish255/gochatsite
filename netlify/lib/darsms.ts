const DARSMS_URL = "https://dev.darsms.co.tz/api/v1/integrations/sms/send";

export function normalizeTanzaniaPhone(value: unknown): string | null {
  let phone = String(value ?? "").replace(/[\s()-]/g, "");
  if (phone.startsWith("+")) phone = phone.slice(1);
  if (phone.startsWith("0")) phone = `255${phone.slice(1)}`;
  return /^255\d{9}$/.test(phone) ? phone : null;
}

export async function sendDarsms(phone: string, message: string) {
  const apiKey = process.env["DARSMS_API_KEY"];
  const senderId = process.env["DARSMS_SENDER_ID"] || "AJIRA PLUS";
  if (!apiKey) throw new Error("DARSMS_API_KEY haijawekwa kwenye environment variables.");
  const to = normalizeTanzaniaPhone(phone);
  if (!to) throw new Error("Namba ya simu si sahihi.");

  const response = await fetch(DARSMS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
    body: JSON.stringify({ senderId, to: [to], message }),
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      `DARSMS API error (${response.status}): ${String(payload?.message || payload?.error || "Utumaji umeshindwa.").slice(0, 250)}`,
    );
  }
  return payload;
}
