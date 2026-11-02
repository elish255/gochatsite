// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ sql: vi.fn(), send: vi.fn() }));
vi.mock("@netlify/database", () => ({ getDatabase: () => ({ sql: mocks.sql }) }));
vi.mock("web-push", () => ({ default: { sendNotification: mocks.send } }));
import { deliverAdminPush } from "../../netlify/lib/admin-push";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.send.mockResolvedValue({});
  mocks.sql.mockImplementation(async (parts: TemplateStringsArray) => {
    const q = parts.join("");
    if (q.includes("RETURNING event_id")) return [{ event_id: "12", subscription_id: "device" }];
    if (q.includes("SELECT public_key"))
      return [{ public_key: "test-public", private_key: "test-private" }];
    if (q.includes("SELECT e.kind"))
      return [
        {
          kind: "support",
          endpoint: "https://fcm.googleapis.com/example",
          subscription: { endpoint: "https://fcm.googleapis.com/example" },
        },
      ];
    return [];
  });
});
it("delivers an admin notice and marks the durable delivery as complete", async () => {
  await deliverAdminPush();
  const payload = JSON.parse(mocks.send.mock.calls[0]?.[1]);
  expect(payload).toMatchObject({
    body: "Ujumbe mpya wa customer care.",
    url: "/admin?customer-care=1",
  });
  expect(mocks.sql.mock.calls.some(([q]) => q.join("").includes("SET delivered_at=now()"))).toBe(
    true,
  );
});
it("deletes expired subscriptions instead of retrying them", async () => {
  mocks.send.mockRejectedValue({ statusCode: 410 });
  await deliverAdminPush();
  expect(
    mocks.sql.mock.calls.some(([q]) =>
      q.join("").includes("DELETE FROM gochati_push_subscriptions"),
    ),
  ).toBe(true);
  expect(mocks.sql.mock.calls.some(([q]) => q.join("").includes("SET delivered_at=now()"))).toBe(
    false,
  );
});
it("keeps transient failures queued for a scheduled retry", async () => {
  mocks.send.mockRejectedValue({ statusCode: 503 });
  await deliverAdminPush();
  const claim = mocks.sql.mock.calls[0]?.[0].join("");
  expect(claim).toContain("SKIP LOCKED");
  expect(claim).toContain("next_attempt_at=");
  expect(
    mocks.sql.mock.calls.some(([q]) =>
      q.join("").includes("DELETE FROM gochati_push_subscriptions"),
    ),
  ).toBe(false);
  expect(mocks.sql.mock.calls.some(([q]) => q.join("").includes("SET delivered_at=now()"))).toBe(
    false,
  );
});
it("does not push after admin access has been revoked", async () => {
  mocks.sql.mockImplementation(async (parts: TemplateStringsArray) => {
    const q = parts.join("");
    if (q.includes("RETURNING event_id")) return [{ event_id: "12", subscription_id: "device" }];
    if (q.includes("SELECT public_key"))
      return [{ public_key: "test-public", private_key: "test-private" }];
    return [];
  });
  await deliverAdminPush();
  expect(mocks.send).not.toHaveBeenCalled();
});
