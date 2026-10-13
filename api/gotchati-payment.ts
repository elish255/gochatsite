import { createClient } from "@supabase/supabase-js";

const send = (res: any, status: number, body: Record<string, unknown>) => res.status(status).json(body);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return send(res, 405, { message: "Method not allowed." });
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const secret = process.env.FIMIPAY_SECRET_KEY;
    if (!supabaseUrl || !anonKey || !serviceKey || !secret) {
      console.error("Missing server payment configuration", { supabaseUrl: !!supabaseUrl, anonKey: !!anonKey, serviceKey: !!serviceKey, paymentSecret: !!secret });
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
      if (!([16000, 32000].includes(amount)) || (purpose === "premium" && amount !== 32000) || (purpose !== "premium" && amount !== 16000)) return send(res, 400, { message: "Kiasi cha malipo si sahihi." });
      const { data: profile, error: profileError } = await admin.from("gotchati_users").select("full_name,username,activation_paid,account_status,is_premium").eq("id", user.id).maybeSingle();
      if (profileError || !profile) return send(res, 404, { message: "Taarifa za akaunti hazijapatikana. Tafadhali wasiliana na huduma kwa wateja." });
      if (purpose === "activation" && profile.activation_paid && profile.account_status === "active") return send(res, 409, { message: "Akaunti yako tayari imewashwa." });
      if (purpose === "premium" && profile.is_premium) return send(res, 409, { message: "Akaunti yako tayari ni Premium." });
      const providerResponse = await fetch("https://fimipay.com/api/v1/payment/create_order", {
        method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ buyer_name: profile.full_name || profile.username, buyer_phone: phone, amount, currency: "TZS", payment_method: "mobile" })
      });
      const providerData: any = await providerResponse.json().catch(() => ({}));
      const order = providerData?.data || providerData;
      if (!providerResponse.ok || !order?.order_id) {
        console.error("Payment provider create_order failed", providerResponse.status, providerData);
        return send(res, 502, { message: providerData?.message || "Imeshindikana kutuma ombi la malipo. Hakikisha namba ni sahihi kisha ujaribu tena." });
      }
      const orderId = String(order.order_id);
      const { error: insertError } = await admin.from("gotchati_payments").insert({ user_id: user.id, order_id: orderId, amount, currency: "TZS", phone, status: String(order.payment_status || "PENDING").toLowerCase() });
      if (insertError) { console.error("Could not save payment order", insertError); return send(res, 500, { message: "Ombi limetumwa lakini mfumo haukuweza kuhifadhi kumbukumbu. Wasiliana na huduma kwa wateja kabla ya kujaribu tena." }); }
      return send(res, 200, { order_id: orderId, payment_status: order.payment_status || "PENDING" });
    }

    if (body.action === "status") {
      const orderId = String(body.order_id || "").trim();
      if (!orderId) return send(res, 400, { message: "Namba ya oda haipo." });
      const { data: payment, error: paymentError } = await admin.from("gotchati_payments").select("id,user_id,amount,status").eq("order_id", orderId).eq("user_id", user.id).maybeSingle();
      if (paymentError || !payment) return send(res, 404, { message: "Oda ya malipo haijapatikana." });
      const providerResponse = await fetch("https://fimipay.com/api/v1/payment/order_status", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ order_id: orderId }) });
      const providerData: any = await providerResponse.json().catch(() => ({}));
      const result = providerData?.data || providerData;
      if (!providerResponse.ok) { console.error("Payment provider order_status failed", providerResponse.status, providerData); return send(res, 502, { message: "Imeshindikana kuthibitisha malipo kwa sasa." }); }
      const status = String(result?.payment_status || "PENDING").toUpperCase();
      const { error: updatePaymentError } = await admin.from("gotchati_payments").update({ status: status.toLowerCase(), provider_reference: result?.transid || null, completed_at: status === "SUCCESS" || status === "COMPLETED" ? new Date().toISOString() : null }).eq("id", payment.id);
      if (updatePaymentError) console.error("Payment status save failed", updatePaymentError);
      if (status === "SUCCESS" || status === "COMPLETED") {
        const isPremiumPayment = Number(payment.amount) === 32000;
        const changes = isPremiumPayment ? { is_premium: true, updated_at: new Date().toISOString() } : { activation_paid: true, account_status: "active", updated_at: new Date().toISOString() };
        const { error: activateError } = await admin.from("gotchati_users").update(changes).eq("id", user.id);
        if (activateError) { console.error("Account activation/upgrade failed", activateError); return send(res, 500, { message: "Malipo yamethibitishwa lakini akaunti haikuweza kusasishwa. Wasiliana na huduma kwa wateja." }); }
      }
      return send(res, 200, { payment_status: status });
    }
    return send(res, 400, { message: "Ombi halijatambulika." });
  } catch (error) {
    console.error("Gotchati payment API error", error);
    return send(res, 500, { message: "Kuna hitilafu ya muda kwenye malipo. Tafadhali jaribu tena." });
  }
}
