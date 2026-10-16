import { assert } from "./platform.js";
export function verifiedPaymentStatus(
  payment: { order_id: string; amount: number | string },
  result: any,
): string {
  assert(result && typeof result === "object", 502, "Jibu la SplashPay halijakamilika.");
  const reference = String(result.reference || result.merchant_reference || "");
  assert(
    reference === payment.order_id &&
      Number(result.amount) === Number(payment.amount) &&
      String(result.currency).toUpperCase() === "TZS",
    409,
    "Taarifa za malipo hazilingani. Wasiliana na admin.",
  );
  const status = String(result.status || "").toLowerCase();
  assert(
    ["pending", "success", "failed", "cancelled", "expired", "rejected", "user_cancelled"].includes(
      status,
    ),
    502,
    "Hali ya malipo haijatambulika.",
  );
  return status;
}
