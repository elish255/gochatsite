import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const BASE_URL = "https://api.splashpay.co.tz/api/v1";
const send = (res: any, status: number, body: Record<string, unknown>) => res.status(status).json(body);
const normalizeStatus = (value: unknown) => String(value || "pending").toLowerCase();

async function applySuccessfulPayment(admin: any, payment: any, providerReference?: string | null) {
  const { error: paymentUpdateError } = await admin.from("gochati_payments").update({
    status: "success",
    provider_reference: providerReference || null,
    completed_at: new Date().toISOString(),
  }).eq("id", payment.id);
  if (paymentUpdateError) throw paymentUpdateError;

  const purpose = String(payment.purpose || "activation");
  const changes = purpose === "vip"
    ? { is_vip: true, updated_at: new Date().toISOString() }
    : purpose === "premium"
      ? { is_premium: true, updated_at: new Date().toISOString() }
      : { activation_paid: true, account_status: "active", updated_at: new Date().toISOString() };
  const { error } = await admin.from("gochati_users").update(changes).eq("id", payment.user_id);
  if (error) throw error;
}

async function syncPaymentStatus(admin: any, payment: any, providerData: any) {
  const result = providerData?.data || providerData;
  const status = normalizeStatus(result?.status);
  const providerReference = result?.provider_reference || null;
  if (status === "success") {
    await applySuccessfulPayment(admin, payment, providerReference);
  } else if (["failed", "cancelled", "expired", "rejected", "user_cancelled"].includes(status)) {
    const { error } = await admin.from("gochati_payments").update({ status, provider_reference: providerReference }).eq("id", payment.id);
    if (error) throw error;
  } else {
    const { error } = await admin.from("gochati_payments").update({ status, provider_reference: providerReference }).eq("id", payment.id);
    if (error) throw error;
  }
  return status;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return send(res, 405, { message: "Method not allowed." });
  try {
    const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
    const anonKey = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_ANON_KEY"] || process.env["VITE_SUPABASE_ANON_KEY"];
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    const apiKey = process.env["SPLASHPAY_API_KEY"];
    const apiSecret = process.env["SPLASHPAY_API_SECRET"];
    if (!supabaseUrl || !anonKey || !serviceKey || !apiKey || !apiSecret) {
      console.error("Missing server payment configuration", { supabaseUrl: !!supabaseUrl, anonKey: !!anonKey, serviceKey: !!serviceKey, splashKey: !!apiKey, splashSecret: !!apiSecret });
      return send(res, 500, { message: "Huduma ya malipo haijawekwa sawa. Tafadhali wasiliana na huduma kwa wateja." });
    }
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return send(res, 401, { message: "Tafadhali ingia kwenye akaunti yako." });
    const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userResult, error: authError } = await userClient.auth.getUser(token);
    if (authError || !userResult.user) return send(res, 401, { message: "Session imeisha. Ingia tena kisha ujaribu." });
    const user = userResult.user;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    if (body.action === "create") {
      const phone = String(body.phone || "").replace(/\D/g, "");
      if (!/^255[0-9]{9}$/.test(phone)) return send(res, 400, { message: "Weka namba sahihi ya simu ya Tanzania." });
      const amount = Number(body.amount);
      const purpose = String(body.purpose || "activation");
      if (!([16000, 32000, 35000].includes(amount)) || (purpose === "premium" && amount !== 32000) || (purpose === "vip" && amount !== 35000) || (purpose === "activation" && amount !== 16000) || !["activation", "premium", "vip"].includes(purpose)) return send(res, 400, { message: "Kiasi cha malipo si sahihi." });
      const { data: profile, error: profileError } = await admin.from("gochati_users").select("full_name,username,activation_paid,account_status,is_premium,is_vip").eq("id", user.id).maybeSingle();
      if (profileError || !profile) return send(res, 404, { message: "Taarifa za akaunti hazijapatikana. Tafadhali wasiliana na huduma kwa wateja." });
      if (purpose === "activation" && profile.activation_paid && profile.account_status === "active") return send(res, 409, { message: "Akaunti yako tayari imewashwa." });
      if (purpose === "premium" && profile.is_premium) return send(res, 409, { message: "Akaunti yako tayari ni Premium." });
      if (purpose === "vip" && profile.is_vip) return send(res, 409, { message: "Akaunti yako tayari ni VIP." });

      const reference = `INV-${randomUUID()}`;
      const { data: payment, error: insertError } = await admin.from("gochati_payments").insert({ user_id: user.id, order_id: reference, amount, currency: "TZS", phone, status: "pending", purpose }).select("id,order_id,amount,purpose,user_id").single();
      if (insertError || !payment) { console.error("Could not save SplashPay payment", insertError); return send(res, 500, { message: "Imeshindikana kuhifadhi ombi la malipo. Tafadhali jaribu tena." }); }

      const providerResponse = await fetch(`${BASE_URL}/payments/mobile-money`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-KEY": apiKey, "X-API-SECRET": apiSecret, "Idempotency-Key": reference },
        body: JSON.stringify({ amount, currency: "TZS", reference, phone_number: phone, customer_name: profile.full_name || profile.username, customer_email: user.email || `${profile.username}@gochati.local`, metadata: { user_id: user.id, purpose } }),
      });
      const providerData: any = await providerResponse.json().catch(() => ({}));
      const result = providerData?.data || providerData;
      if (!providerResponse.ok || String(providerData?.status || "").toLowerCase() !== "success") {
        console.error("SplashPay payment initiation failed", providerResponse.status, providerData);
        await admin.from("gochati_payments").update({ status: "failed" }).eq("id", payment.id);
        return send(res, 502, { message: providerData?.message || "Imeshindikana kutuma ombi la malipo. Hakikisha namba ni sahihi kisha ujaribu tena." });
      }
      await admin.from("gochati_payments").update({ status: normalizeStatus(result.status), provider_reference: result.provider_reference || result.transaction_reference || result.transaction_id || result.id || null }).eq("id", payment.id);
      return send(res, 200, { reference, payment_status: normalizeStatus(result.status), message: providerData.message || "Ombi la malipo limetumwa." });
    }

    if (body.action === "status") {
      const reference = String(body.reference || "").trim();
      if (!reference) return send(res, 400, { message: "Namba ya malipo haipo." });
      const { data: payment, error: paymentError } = await admin.from("gochati_payments").select("id,user_id,amount,status,order_id,provider_reference,purpose,currency").eq("order_id", reference).eq("user_id", user.id).maybeSingle();
      if (paymentError || !payment) return send(res, 404, { message: "Ombi la malipo halijapatikana." });
      if (payment.status === "success") return send(res, 200, { payment_status: "success", reference });
      const providerResponse = await fetch(`${BASE_URL}/payments/check-status`, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-KEY": apiKey, "X-API-SECRET": apiSecret }, body: JSON.stringify({ reference }),
      });
      const providerData: any = await providerResponse.json().catch(() => ({}));
      if (!providerResponse.ok || providerData?.status !== "success") { console.error("SplashPay status check failed", providerResponse.status, providerData); return send(res, 502, { message: "Imeshindikana kuthibitisha malipo kwa sasa." }); }
      const result = providerData?.data || {};
      const returnedReference = String(result.reference || result.merchant_reference || "");
      if (Number(result.amount) !== Number(payment.amount) || String(result.currency || "").toUpperCase() !== "TZS" || (returnedReference && returnedReference !== reference)) return send(res, 409, { message: "Taarifa za malipo hazilingani. Wasiliana na huduma kwa wateja." });
      const status = await syncPaymentStatus(admin, payment, result);
      return send(res, 200, { payment_status: status, reference });
    }
    return send(res, 400, { message: "Ombi halijatambulika." });
  } catch (error) {
    console.error("Gochati payment API error", error);
    return send(res, 500, { message: "Kuna hitilafu ya muda kwenye malipo. Tafadhali jaribu tena." });
  }
}
