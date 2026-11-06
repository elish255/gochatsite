
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const config = {
  api: {
    bodyParser: false,
  },
};

const URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "";

const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const BUCKET = "gochati-support";
const MAX_FILE_SIZE = 4_000_000;

const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-m4a": "m4a",
};

function respond(res: any, status: number, data: unknown) {
  return res.status(status).json(data);
}

function errorMessage(error: any) {
  return error?.message || "Huduma haipatikani. Jaribu tena.";
}

function createError(message: string, status: number) {
  const error: any = new Error(message);
  error.status = status;
  return error;
}

function getClients() {
  if (!URL || !ANON_KEY || !SERVICE_KEY) {
    throw new Error(
      "Supabase server environment variables hazijakamilika."
    );
  }

  const authClient = createClient(URL, ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const db = createClient(URL, SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return { authClient, db };
}

async function getIdentity(req: any) {
  const authorization =
    req.headers?.authorization ||
    req.headers?.Authorization ||
    "";

  const match = String(authorization).match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() || "";

  if (!token) {
    throw createError(
      "Token haijatumwa. Tafadhali ingia tena kwenye akaunti yako.",
      401
    );
  }

  const { authClient, db } = getClients();

  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data?.user) {
    throw createError(
      "Session imeisha au si sahihi. Tafadhali ingia tena.",
      401
    );
  }

  const user = data.user;

  const { data: admin, error: adminError } = await db
    .from("gochati_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) throw adminError;

  return {
    user,
    db,
    isAdmin: !!admin,
  };
}

async function getProfile(db: any, userId: string) {
  const { data, error } = await db
    .from("gochati_users")
    .select("id, username, full_name, phone")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function sendPush(
  db: any,
  title: string,
  body: string,
  url = "/"
) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) return;

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch {
    return;
  }

  const { data: subscriptions, error } = await db
    .from("gochati_push_subscriptions")
    .select("id, admin_id, subscription");

  if (error || !subscriptions?.length) return;

  const payload = JSON.stringify({
    title,
    body,
    url,
    icon: "/icon-192.png",
  });

  await Promise.all(
    subscriptions.map(async (item: any) => {
      try {
        await webpush.sendNotification(
          item.subscription,
          payload
        );
      } catch (error: any) {
        if (
          error?.statusCode === 404 ||
          error?.statusCode === 410
        ) {
          await db
            .from("gochati_push_subscriptions")
            .delete()
            .eq("id", item.id);
        }
      }
    })
  );
}

async function createSupportEvent(
  db: any,
  userId: string,
  username: string | null
) {
  const { error } = await db
    .from("gochati_admin_events")
    .insert({
      kind: "support",
      user_id: userId,
      username,
    });

  if (error) throw error;

  await sendPush(
    db,
    "GoChati Customer Care",
    `Ujumbe mpya kutoka ${username || "mteja"}`,
    "/admin"
  );
}

async function getSignedMessages(db: any, rows: any[]) {
  return Promise.all(
    rows.map(async (message) => {
      let file_url: string | null = null;

      if (message.storage_path) {
        const { data, error } = await db.storage
          .from(BUCKET)
          .createSignedUrl(message.storage_path, 3600);

        if (!error) {
          file_url = data?.signedUrl || null;
        }
      }

      return {
        ...message,
        file_url,
      };
    })
  );
}

async function readRawBody(req: any): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;

  for await (const chunk of req) {
    const part =
      typeof chunk === "string"
        ? new TextEncoder().encode(chunk)
        : new Uint8Array(chunk);

    chunks.push(part);
    total += part.length;
  }

  const result = new Uint8Array(total);
  let offset = 0;

  for (const part of chunks) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

async function parseRequest(req: any) {
  const raw = await readRawBody(req);
  const contentType = req.headers["content-type"] || "";

  if (contentType.includes("multipart/form-data")) {
    const headers = new Headers();
    headers.set("Content-Type", contentType);

    const request = new Request("http://localhost", {
      method: "POST",
      headers,
      body: raw,
    });

    return {
      type: "multipart" as const,
      form: await request.formData(),
    };
  }

  if (!raw.length) {
    return {
      type: "json" as const,
      body: {},
    };
  }

  return {
    type: "json" as const,
    body: JSON.parse(new TextDecoder().decode(raw)),
  };
}

async function handleUpload(
  form: FormData,
  identity: any
) {
  const { user, db, isAdmin } = identity;

  const file = form.get("file");

  if (!(file instanceof File)) {
    throw new Error("Chagua picha au faili la sauti.");
  }

  if (!file.size || file.size > MAX_FILE_SIZE) {
    throw new Error("Faili lisizidi MB 4.");
  }

  const extension = allowedTypes[file.type];

  if (!extension) {
    throw new Error("Aina ya faili hairuhusiwi.");
  }

  const requestedUserId = String(
    form.get("user_id") || ""
  );

  const targetUserId = isAdmin
    ? requestedUserId
    : user.id;

  if (!targetUserId) {
    throw new Error("Mtumiaji hajachaguliwa.");
  }

  if (!isAdmin && targetUserId !== user.id) {
    throw createError(
      "Huruhusiwi kufikia mazungumzo haya.",
      403
    );
  }

  if (isAdmin) {
    const { data: target, error: targetError } =
      await db.auth.admin.getUserById(targetUserId);

    if (targetError || !target?.user) {
      throw new Error("Mtumiaji huyo hapatikani.");
    }
  }

  const kind = file.type.startsWith("image/")
    ? "image"
    : "audio";

  const path =
    `${targetUserId}/${crypto.randomUUID()}.${extension}`;

  const bytes = new Uint8Array(
    await file.arrayBuffer()
  );

  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: message, error: insertError } = await db
    .from("gochati_support_messages")
    .insert({
      user_id: targetUserId,
      sender: isAdmin ? "admin" : "user",
      body: "",
      kind,
      storage_path: path,
    })
    .select()
    .single();

  if (insertError) {
    await db.storage.from(BUCKET).remove([path]);
    throw insertError;
  }

  if (!isAdmin) {
    const profile = await getProfile(db, targetUserId);

    await createSupportEvent(
      db,
      targetUserId,
      profile?.username || null
    );
  }

  const [result] = await getSignedMessages(db, [message]);

  return { data: result };
}

async function handleAction(body: any, identity: any) {
  const { user, db, isAdmin } = identity;
  const action = body.action;

  // CUSTOMER CARE STATUS
  if (action === "status") {
    if (isAdmin) {
      return {
        active: true,
        unread: 0,
      };
    }

    const { data: profile, error: profileError } = await db
      .from("gochati_users")
      .select("account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const active =
      profile?.account_status === "active";

    if (!active) {
      return {
        active: false,
        unread: 0,
      };
    }

    const { count, error: unreadError } = await db
      .from("gochati_support_messages")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id)
      .eq("sender", "admin")
      .is("read_at", null);

    if (unreadError) throw unreadError;

    return {
      active: true,
      unread: count || 0,
    };
  }

  // PUSH PUBLIC KEY
  if (action === "push-key") {
    if (!isAdmin) {
      throw createError(
        "Admin pekee ndiye anaruhusiwa.",
        403
      );
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY;

    if (!publicKey) {
      throw new Error(
        "VAPID_PUBLIC_KEY haijawekwa Vercel."
      );
    }

    return { publicKey };
  }

  // SUBSCRIBE PUSH
  if (action === "subscribe") {
    if (!isAdmin) {
      throw createError(
        "Admin pekee ndiye anaruhusiwa.",
        403
      );
    }

    const subscription = body.subscription;

    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      throw new Error(
        "Push subscription si sahihi."
      );
    }

    const { data: existing, error: findError } = await db
      .from("gochati_push_subscriptions")
      .select("id, subscription")
      .eq("admin_id", user.id);

    if (findError) throw findError;

    const current = (existing || []).find(
      (item: any) =>
        item.subscription?.endpoint === subscription.endpoint
    );

    if (current) {
      const { error } = await db
        .from("gochati_push_subscriptions")
        .update({ subscription })
        .eq("id", current.id);

      if (error) throw error;
    } else {
      const { error } = await db
        .from("gochati_push_subscriptions")
        .insert({
          admin_id: user.id,
          subscription,
        });

      if (error) throw error;
    }

    return { success: true };
  }

  // UNSUBSCRIBE PUSH
  if (action === "unsubscribe") {
    if (!isAdmin) {
      throw createError(
        "Admin pekee ndiye anaruhusiwa.",
        403
      );
    }

    const endpoint = body.subscription?.endpoint;

    if (!endpoint) {
      throw new Error(
        "Push subscription haijatambulika."
      );
    }

    const { data: subscriptions, error: findError } = await db
      .from("gochati_push_subscriptions")
      .select("id, subscription")
      .eq("admin_id", user.id);

    if (findError) throw findError;

    const matching = (subscriptions || []).filter(
      (item: any) =>
        item.subscription?.endpoint === endpoint
    );

    for (const item of matching) {
      const { error } = await db
        .from("gochati_push_subscriptions")
        .delete()
        .eq("id", item.id)
        .eq("admin_id", user.id);

      if (error) throw error;
    }

    return { success: true };
  }

  // ADMIN EVENTS
  if (action === "events") {
    if (!isAdmin) {
      throw createError(
        "Admin pekee ndiye anaruhusiwa.",
        403
      );
    }

    const { data, error } = await db
      .from("gochati_admin_events")
      .select("*")
      .order("id", { ascending: false })
      .limit(50);

    if (error) throw error;

    return { data: data || [] };
  }

  // READ ADMIN EVENTS
  if (action === "read-events") {
    if (!isAdmin) {
      throw createError(
        "Admin pekee ndiye anaruhusiwa.",
        403
      );
    }

    const id = String(body.id || "0");

    const { error } = await db
      .from("gochati_admin_events")
      .update({
        read_at: new Date().toISOString(),
      })
      .lte("id", id)
      .is("read_at", null);

    if (error) throw error;

    return { success: true };
  }

  // READ MESSAGES
  if (action === "messages") {
    const targetUserId = isAdmin
      ? String(body.user_id || "")
      : user.id;

    if (!targetUserId) {
      throw new Error("Mtumiaji hajachaguliwa.");
    }

    if (!isAdmin && targetUserId !== user.id) {
      throw createError(
        "Huruhusiwi kufikia mazungumzo haya.",
        403
      );
    }

    const oppositeSender = isAdmin
      ? "user"
      : "admin";

    let markQuery = db
      .from("gochati_support_messages")
      .update({
        read_at: new Date().toISOString(),
      })
      .eq("user_id", targetUserId)
      .eq("sender", oppositeSender)
      .is("read_at", null);

    if (body.before) {
      markQuery = markQuery.lt(
        "created_at",
        body.before
      );
    }

    const { error: markError } = await markQuery;

    if (markError) throw markError;

    let query = db
      .from("gochati_support_messages")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

    if (body.before) {
      query = query.lt(
        "created_at",
        body.before
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    const messages = await getSignedMessages(
      db,
      (data || []).reverse()
    );

    return { data: messages };
  }

  // SEND MESSAGE
  if (action === "send") {
    const targetUserId = isAdmin
      ? String(body.user_id || "")
      : user.id;

    if (!targetUserId) {
      throw new Error("Mtumiaji hajachaguliwa.");
    }

    const message = String(
      body.message || ""
    ).trim();

    if (!message || message.length > 4000) {
      throw new Error("Ujumbe hauko sahihi.");
    }

    if (!isAdmin && targetUserId !== user.id) {
      throw createError(
        "Huruhusiwi kutuma ujumbe hapa.",
        403
      );
    }

    if (isAdmin) {
      const { data: target, error: targetError } =
        await db.auth.admin.getUserById(targetUserId);

      if (targetError || !target?.user) {
        throw new Error("Mtumiaji huyo hapatikani.");
      }
    }

    const { data, error } = await db
      .from("gochati_support_messages")
      .insert({
        user_id: targetUserId,
        sender: isAdmin ? "admin" : "user",
        body: message,
        kind: "text",
      })
      .select()
      .single();

    if (error) throw error;

    if (!isAdmin) {
      const profile = await getProfile(db, targetUserId);

      await createSupportEvent(
        db,
        targetUserId,
        profile?.username || null
      );
    }

    return { data };
  }

  // ADMIN INBOX
  if (action === "inbox") {
    if (!isAdmin) {
      throw createError(
        "Admin pekee ndiye anaruhusiwa.",
        403
      );
    }

    const search = String(
      body.search || ""
    ).trim();

    let profilesQuery = db
      .from("gochati_users")
      .select("id, username, full_name, phone")
      .limit(300);

    if (search) {
      const safeSearch = search.replace(
        /[,%()]/g,
        " "
      );

      profilesQuery = profilesQuery.or(
        `username.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`
      );
    }

    const {
      data: profiles,
      error: profileError,
    } = await profilesQuery;

    if (profileError) throw profileError;

    const { data: recent, error: messageError } =
      await db
        .from("gochati_support_messages")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(1000);

    if (messageError) throw messageError;

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.id, p])
    );

    const grouped = new Map<string, any>();

    for (const message of recent || []) {
      const id = message.user_id;
      const profile = profileMap.get(id);

      if (!profile) continue;

      if (!grouped.has(id)) {
        grouped.set(id, {
          id,
          username: profile.username || "",
          full_name: profile.full_name || "",
          body: message.body,
          kind: message.kind,
          created_at: message.created_at,
          unread: 0,
        });
      }

      if (
        message.sender === "user" &&
        !message.read_at
      ) {
        grouped.get(id).unread++;
      }
    }

    return {
      data: Array.from(grouped.values()).sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      ),
    };
  }

  // BANNED PHONE NUMBERS
  if (action === "bans") {
    if (!isAdmin) {
      throw createError(
        "Admin pekee ndiye anaruhusiwa.",
        403
      );
    }

    const { data, error } = await db
      .from("gochati_phone_bans")
      .select("phone, reason, created_at")
      .order("created_at", {
        ascending: false,
      });

    if (error) throw error;

    return { data: data || [] };
  }

  // BAN / UNBAN PHONE
  if (action === "ban" || action === "unban") {
    if (!isAdmin) {
      throw createError(
        "Admin pekee ndiye anaruhusiwa.",
        403
      );
    }

    const phone = String(
      body.phone || ""
    ).replace(/\s+/g, "");

    if (!phone || phone.length > 30) {
      throw new Error("Namba ya simu si sahihi.");
    }

    if (action === "ban") {
      const { error } = await db
        .from("gochati_phone_bans")
        .upsert(
          {
            phone,
            reason: String(
              body.reason || ""
            ).slice(0, 300),
            admin_id: user.id,
          },
          {
            onConflict: "phone",
          }
        );

      if (error) throw error;
    } else {
      const { error } = await db
        .from("gochati_phone_bans")
        .delete()
        .eq("phone", phone);

      if (error) throw error;
    }

    return { success: true };
  }

  throw new Error("Action haijulikani.");
}

export default async function handler(
  req: any,
  res: any
) {
  if (req.method !== "POST") {
    return respond(res, 405, {
      message: "Method haikubaliki.",
    });
  }

  try {
    const identity = await getIdentity(req);

    const parsed = await parseRequest(req);

    if (parsed.type === "multipart") {
      const result = await handleUpload(
        parsed.form,
        identity
      );

      return respond(res, 200, result);
    }

    const result = await handleAction(
      parsed.body,
      identity
    );

    return respond(res, 200, result);
  } catch (error: any) {
    const message = errorMessage(error);

    const status =
      error?.status ||
      (
        message.toLowerCase().includes("token") ||
        message.toLowerCase().includes("session") ||
        message.toLowerCase().includes("ingia")
          ? 401
          : message.toLowerCase().includes("ruhusiwi") ||
            message.toLowerCase().includes("admin pekee")
            ? 403
            : 400
      );

    return respond(res, status, {
      message,
    });
  }
}
