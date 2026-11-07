
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const reply = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return reply({ message: "Method not allowed." }, 405);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!url || !anonKey || !serviceKey) {
    return reply(
      { message: "Supabase auth configuration is missing." },
      500
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const body = await request.json().catch(() => ({}));

  const action = String(body.action || "");
  const username = String(body.username || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (
    !/^[a-z0-9_]{3,30}$/.test(username) ||
    password.length < 6 ||
    password.length > 256
  ) {
    return reply(
      {
        message:
          "Weka username sahihi na password yenye angalau herufi/namba 6.",
      },
      400
    );
  }

  // LOGIN
  if (action === "login") {
    const { data: profile, error } = await admin
      .from("gochati_users")
      .select("email")
      .ilike("username", username)
      .maybeSingle();

    if (error || !profile?.email) {
      return reply(
        { message: "Username au password si sahihi." },
        401
      );
    }

    const auth = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error: signInError } =
      await auth.auth.signInWithPassword({
        email: profile.email,
        password,
      });

    if (signInError || !data.session) {
      return reply(
        { message: "Username au password si sahihi." },
        401
      );
    }

    return reply({
      data: {
        session: data.session,
      },
    });
  }

  // REGISTER
  if (action === "register") {
    const email = String(body.email || "").trim().toLowerCase();
    const metadata = body.metadata || {};

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      body.agree_terms !== true ||
      !String(metadata.full_name || "").trim() ||
      !String(metadata.phone || "").trim()
    ) {
      return reply(
        {
          message:
            "Jaza taarifa zote zinazohitajika na ukubali masharti.",
        },
        400
      );
    }

    const { data: existing, error: lookupError } = await admin
      .from("gochati_users")
      .select("id")
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1);

    if (lookupError) {
      return reply(
        { message: "Imeshindikana kuhakiki taarifa zako." },
        500
      );
    }

    if (existing?.length) {
      return reply(
        { message: "Username au email tayari inatumika." },
        409
      );
    }

    const publicAuth = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const fullName = String(metadata.full_name).trim();
    const phone = String(metadata.phone).trim();
    const country = String(metadata.country || "");

    const referralUsername =
      String(metadata.referral_username || "")
        .trim()
        .toLowerCase() || null;

    const { data: signup, error: signupError } =
      await publicAuth.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
            phone,
            country,
            referral_username: referralUsername,
          },
        },
      });

    if (signupError || !signup.user) {
      return reply(
        {
          message: signupError?.message || "Usajili umeshindwa.",
        },
        400
      );
    }

    // Create or update profile as ACTIVE immediately.
    // No activation payment is required for new registrations.
    const { error: insertError } = await admin
      .from("gochati_users")
      .upsert(
        {
          id: signup.user.id,
          email,
          username,
          full_name: fullName,
          phone,
          country,

          account_status: "active",
          activation_paid: true,
        },
        {
          onConflict: "id",
        }
      );

    if (insertError) {
      console.error("Profile creation failed:", insertError);

      await admin.auth.admin.deleteUser(signup.user.id);

      return reply(
        {
          message:
            "Imeshindikana kuhifadhi akaunti. Hakikisha migrations za GoChati zimewekwa.",
        },
        500
      );
    }

    // The auth.users trigger records the registration event. Send a real
    // browser push as well when the Admin has enabled phone notifications.
    try {
      const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
      const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
      const subject = Deno.env.get("VAPID_SUBJECT");
      if (publicKey && privateKey && subject) {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        const { data: subscriptions } = await admin
          .from("gochati_push_subscriptions")
          .select("id,subscription");
        const payload = JSON.stringify({
          title: "Gochati · Usajili mpya",
          body: `${username} (${fullName}) amejisajili kwenye Gochati.online.`,
          url: "/admin",
          icon: "/icon-192.png",
        });
        await Promise.all((subscriptions || []).map(async (item: any) => {
          try {
            await webpush.sendNotification(item.subscription, payload);
          } catch (pushError: any) {
            if (pushError?.statusCode === 404 || pushError?.statusCode === 410) {
              await admin.from("gochati_push_subscriptions").delete().eq("id", item.id);
            }
            console.error("Registration push failed", pushError?.message || pushError);
          }
        }));
      }
    } catch (pushError) {
      // Notification delivery must never undo a successful registration.
      console.error("Could not send registration push", pushError);
    }

    return reply(
      {
        data: {
          user: signup.user,
          session: signup.session,
        },
      },
      200
    );
  }

  return reply(
    { message: "Ombi halijatambulika." },
    400
  );
});
