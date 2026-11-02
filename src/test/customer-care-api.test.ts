// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import type { Context } from "@netlify/functions";
const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  sql: vi.fn(),
  blobGet: vi.fn(),
  blobSet: vi.fn(),
  push: vi.fn(),
  query: vi.fn(),
  release: vi.fn(),
}));
vi.mock("../../netlify/lib/platform.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../netlify/lib/platform.js")>()),
  authenticated: mocks.authenticated,
}));
vi.mock("@netlify/blobs", () => ({ getStore: () => ({ get: mocks.blobGet, set: mocks.blobSet }) }));
vi.mock("../../netlify/lib/admin-push.js", () => ({
  deliverAdminPush: mocks.push,
  pushKeys: vi.fn(),
}));
import handler from "../../netlify/functions/gochati-support.mts";
import { attachmentKind, normalizePhone, validPushEndpoint } from "../../netlify/lib/customer-care";
import { HttpError } from "../../netlify/lib/platform";
const own = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const other = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const context = { waitUntil: vi.fn() } as unknown as Context;
const request = (body: unknown, origin = "https://gochati.online") =>
  new Request("https://gochati.online/api/gochati-support", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticated.mockResolvedValue({
    db: {
      sql: mocks.sql,
      pool: { connect: async () => ({ query: mocks.query, release: mocks.release }) },
    },
    user: { id: own },
    profile: { account_status: "active", activation_paid: true },
    isAdmin: false,
  });
  mocks.sql.mockImplementation(async (parts: TemplateStringsArray) =>
    parts.join("").includes("FROM gochati_users")
      ? [{ account_status: "active", activation_paid: true }]
      : parts.join("").includes("gochati_auth_limits")
        ? [{ attempts: 1 }]
        : [],
  );
  mocks.push.mockResolvedValue(undefined);
  mocks.query.mockResolvedValue({ rows: [] });
});
it("rejects requests without a session", async () => {
  mocks.authenticated.mockRejectedValue(new HttpError(401, "Ingia kwanza."));
  expect((await handler(request({ action: "messages" }), context)).status).toBe(401);
  expect(mocks.sql).not.toHaveBeenCalled();
});
it.each([
  "inbox",
  "events",
  "read-events",
  "bans",
  "ban",
  "unban",
  "push-key",
  "subscribe",
  "unsubscribe",
])("restricts %s to admins", async (action) => {
  expect((await handler(request({ action, phone: "0712345678" }), context)).status).toBe(403);
  expect(mocks.sql).not.toHaveBeenCalled();
});
it("enforces active status on the server", async () => {
  mocks.sql.mockResolvedValue([{ account_status: "pending", activation_paid: false }]);
  expect((await handler(request({ action: "send", message: "Habari" }), context)).status).toBe(403);
  expect(mocks.push).not.toHaveBeenCalled();
});
it("ignores a forged conversation owner and stores the authenticated sender", async () => {
  expect(
    (await handler(request({ action: "send", user_id: other, message: "Habari" }), context)).status,
  ).toBe(201);
  const insert = mocks.sql.mock.calls.find(([p]) =>
    p.join("").includes("INSERT INTO gochati_support_messages"),
  );
  expect(insert?.slice(1)).toEqual([own, own, "user", "Habari"]);
  expect(mocks.push).toHaveBeenCalledOnce();
});
it("does not allow another user to download private attachments", async () => {
  mocks.sql.mockResolvedValue([{ user_id: other, blob_key: "private", mime: "image/png" }]);
  const response = await handler(
    new Request(`https://gochati.online/api/gochati-support?file=${other}`),
    context,
  );
  expect(response.status).toBe(403);
  expect(mocks.blobGet).not.toHaveBeenCalled();
});
it("does not allow cross-origin writes", async () => {
  expect(
    (await handler(request({ action: "send", message: "Hi" }, "https://other.example"), context))
      .status,
  ).toBe(403);
  expect(mocks.sql).not.toHaveBeenCalled();
});
it("rate limits messages before insertion", async () => {
  mocks.sql.mockImplementation(async (parts: TemplateStringsArray) =>
    parts.join("").includes("FROM gochati_users")
      ? [{ account_status: "active", activation_paid: true }]
      : [{ attempts: 31 }],
  );
  expect((await handler(request({ action: "send", message: "Habari" }), context)).status).toBe(429);
  expect(mocks.push).not.toHaveBeenCalled();
});
it.each([
  "0712345678",
  "712345678",
  "+2550712345678",
  "+255712345678",
  "00255712345678",
  "255 712 345 678",
])("normalizes %s to the same banned number", (phone) => {
  expect(normalizePhone(phone)).toBe("255712345678");
});
it("rejects HTML disguised as an image and accepts supported binary signatures", () => {
  expect(() => attachmentKind(new TextEncoder().encode("<html>"), "image/png")).toThrow();
  expect(attachmentKind(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "image/png")).toBe(
    "image",
  );
  expect(attachmentKind(new Uint8Array([26, 69, 223, 163]), "audio/webm")).toBe("audio");
});
it("permits known push services and rejects private or lookalike endpoints", () => {
  expect(validPushEndpoint("https://fcm.googleapis.com/fcm/send/example")).toBe(true);
  expect(validPushEndpoint("https://web.push.apple.com/example")).toBe(true);
  for (const url of [
    "http://fcm.googleapis.com/x",
    "https://127.0.0.1/x",
    "https://fcm.googleapis.com.evil.test/x",
    "https://example.test/x",
    "https://fcm.googleapis.com:8888/x",
  ])
    expect(validPushEndpoint(url)).toBe(false);
});
it("bans equivalent phone formats and suspends matching accounts in one transaction", async () => {
  const current = await mocks.authenticated();
  mocks.authenticated.mockResolvedValue({ ...current, isAdmin: true });
  const response = await handler(
    request({ action: "ban", phone: "+255 712 345 678", reason: "Spam" }),
    context,
  );
  expect(response.status).toBe(200);
  const insert = mocks.query.mock.calls.find(([q]) => q.includes("INSERT INTO gochati_phone_bans"));
  expect(insert?.[1]).toEqual(["255712345678", "Spam", own]);
  expect(mocks.query.mock.calls.some(([q]) => q.includes("account_status='banned'"))).toBe(true);
  expect(mocks.query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
  expect(mocks.release).toHaveBeenCalledOnce();
});
it("protects admin phone numbers and rolls back the ban", async () => {
  const current = await mocks.authenticated();
  mocks.authenticated.mockResolvedValue({ ...current, isAdmin: true });
  mocks.query.mockImplementation(async (query: string) => ({
    rows: query.includes("JOIN gochati_admin_emails") ? [{ exists: 1 }] : [],
  }));
  expect((await handler(request({ action: "ban", phone: "0712345678" }), context)).status).toBe(
    403,
  );
  expect(mocks.query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
  expect(mocks.query.mock.calls.some(([q]) => q.includes("INSERT INTO gochati_phone_bans"))).toBe(
    false,
  );
});
it("allows admin replies with a server-assigned admin sender", async () => {
  const current = await mocks.authenticated();
  mocks.authenticated.mockResolvedValue({ ...current, isAdmin: true });
  expect(
    (await handler(request({ action: "send", user_id: other, message: "Tunakusaidia." }), context))
      .status,
  ).toBe(201);
  const insert = mocks.sql.mock.calls.find(([q]) =>
    q.join("").includes("INSERT INTO gochati_support_messages"),
  );
  expect(insert?.slice(1)).toEqual([other, own, "admin", "Tunakusaidia."]);
});
it("returns authorized attachments without public caching", async () => {
  mocks.sql.mockResolvedValue([{ user_id: own, blob_key: "own/image", mime: "image/png" }]);
  mocks.blobGet.mockResolvedValue(new Uint8Array([137, 80, 78, 71]).buffer);
  const response = await handler(
    new Request(`https://gochati.online/api/gochati-support?file=${other}`),
    context,
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
});
it("serves byte ranges for voice playback on mobile browsers", async () => {
  mocks.sql.mockResolvedValue([{ user_id: own, blob_key: "own/voice", mime: "audio/mp4" }]);
  mocks.blobGet.mockResolvedValue(new Uint8Array([10, 20, 30, 40]).buffer);
  const response = await handler(
    new Request(`https://gochati.online/api/gochati-support?file=${other}`, {
      headers: { Range: "bytes=1-2" },
    }),
    context,
  );
  expect(response.status).toBe(206);
  expect(response.headers.get("content-range")).toBe("bytes 1-2/4");
  expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([20, 30]);
});
it("reports unread customer service replies without marking them read", async () => {
  mocks.sql.mockResolvedValue([{ unread: 3 }]);
  const response = await handler(request({ action: "status", user_id: other }), context);
  expect(await response.json()).toEqual({ active: true, unread: 3 });
  expect(mocks.sql).toHaveBeenCalledOnce();
  expect(mocks.sql.mock.calls[0]?.slice(1)).toEqual([own]);
  expect(mocks.sql.mock.calls[0]?.[0].join("")).toContain("sender='admin' AND read_at IS NULL");
});
it("does not acknowledge messages when only checking for updates", async () => {
  const response = await handler(request({ action: "messages", mark_read: false }), context);
  expect(response.status).toBe(200);
  expect(mocks.sql.mock.calls.some(([q]) => q.join("").includes("SET read_at"))).toBe(false);
});
