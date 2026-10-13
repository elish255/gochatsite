import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async (req) => {
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
 try {
  const url=Deno.env.get("SUPABASE_URL")!; const anon=Deno.env.get("SUPABASE_ANON_KEY")!; const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; const secret=Deno.env.get("FIMIPAY_SECRET_KEY");
  if(!secret) return json({message:"Payment service is not configured."},500);
  const auth=req.headers.get("Authorization")||""; const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}}); const {data:{user},error:userError}=await userClient.auth.getUser();
  if(userError||!user) return json({message:"Please sign in first."},401);
  const admin=createClient(url,service); const body=await req.json();
  if(body.action==="create"){
   const phone=String(body.phone||"").replace(/\D/g,""); if(!/^255[0-9]{9}$/.test(phone))return json({message:"Invalid Tanzania phone number."},400);
   const {data:profile}=await admin.from("gochati_users").select("full_name,username,phone,activation_paid,account_status").eq("id",user.id).single();
   if(!profile)return json({message:"Account profile not found."},404);
   if(profile.activation_paid&&profile.account_status==="active")return json({message:"Account already active."},409);
   const response=await fetch("https://fimipay.com/api/v1/payment/create_order",{method:"POST",headers:{"Authorization":`Bearer ${secret}`,"Content-Type":"application/json","Accept":"application/json","User-Agent":"Gochati-Payment/1.0"},body:JSON.stringify({buyer_name:profile.full_name||profile.username,buyer_phone:phone,amount:16000,currency:"TZS",payment_method:"mobile"})});
   const result=await response.json(); if(!response.ok||!result?.data?.order_id)return json({message:result?.message||"Could not create payment request."},502);
   const orderId=String(result.data.order_id); await admin.from("gochati_payments").insert({user_id:user.id,order_id:orderId,amount:16000,currency:"TZS",phone,status:String(result.data.payment_status||"PENDING").toLowerCase()});
   return json({order_id:orderId,payment_status:result.data.payment_status||"PENDING"});
  }
  if(body.action==="status"){
   const orderId=String(body.order_id||""); const {data:payment}=await admin.from("gochati_payments").select("id,user_id,amount,status").eq("order_id",orderId).eq("user_id",user.id).maybeSingle();
   if(!payment)return json({message:"Payment order not found."},404);
   const response=await fetch("https://fimipay.com/api/v1/payment/order_status",{method:"POST",headers:{"Authorization":`Bearer ${secret}`,"Content-Type":"application/json","Accept":"application/json","User-Agent":"Gochati-Payment/1.0"},body:JSON.stringify({order_id:orderId})}); const result=await response.json(); if(!response.ok)return json({message:"Unable to check payment status."},502);
   const status=String(result?.data?.payment_status||"PENDING").toUpperCase();
   await admin.from("gochati_payments").update({status:status.toLowerCase(),provider_reference:result?.data?.transid||null,completed_at:status==="SUCCESS"?new Date().toISOString():null}).eq("id",payment.id);
   if(status==="SUCCESS"||status==="COMPLETED") await admin.from("gochati_users").update({activation_paid:true,account_status:"active",updated_at:new Date().toISOString()}).eq("id",user.id);
   return json({payment_status:status});
  }
  return json({message:"Unsupported action."},400);
 } catch(error){ console.error("payment function error",error); return json({message:"Payment request failed. Please try again."},500); }
});
