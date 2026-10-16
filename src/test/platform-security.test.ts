// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  query: vi.fn(),
  release: vi.fn(),
  sql: vi.fn(),
}));
vi.mock("../../netlify/lib/platform.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../netlify/lib/platform.js")>();
  return { ...actual, authenticated: mocks.authenticated };
});
import handler from "../../netlify/functions/gochati-data.mts";
import { verifiedPaymentStatus } from "../../netlify/lib/payments";
import { HttpError } from "../../netlify/lib/platform";
const request = (body: unknown, origin = "https://gochati.online") =>
  new Request("https://gochati.online/api/gochati-data", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue({ rows: [] });
  mocks.authenticated.mockResolvedValue({
    user: { id: "user-one" },
    profile: { activation_paid: true, account_status: "active" },
    isAdmin: false,
    db: {
      sql: mocks.sql,
      pool: { connect: async () => ({ query: mocks.query, release: mocks.release }) },
    },
  });
});
describe("Account API access", () => {
  it("rejects cross-origin mutations before authentication", async () => {
    expect(
      (
        await handler(
          request({ table: "gochati_users", operation: "update" }, "https://evil.example"),
        )
      ).status,
    ).toBe(403);
    expect(mocks.authenticated).not.toHaveBeenCalled();
  });
  it("requires an authenticated identity", async () => {
    mocks.authenticated.mockRejectedValue(new HttpError(401, "Sign in required"));
    expect((await handler(request({ table: "gochati_users", operation: "select" }))).status).toBe(
      401,
    );
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("scopes reads to the authenticated user even when a different ID is requested", async () => {
    const response = await handler(
      request({ table: "gochati_users", operation: "select", filters: { id: "someone-else" } }),
    );
    expect(response.status).toBe(200);
    expect(mocks.query.mock.calls[0]?.[0]).toContain('id=$1 AND "id"=$2');
    expect(mocks.query.mock.calls[0]?.[1]).toEqual(["user-one", "someone-else", 100]);
  });
  it("forbids users changing their balance or membership", async () => {
    expect(
      (
        await handler(
          request({
            table: "gochati_users",
            operation: "update",
            filters: { id: "user-one" },
            payload: { balance: 100000, is_vip: true },
          }),
        )
      ).status,
    ).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("forbids creating payment receipts through the data API", async () => {
    expect(
      (
        await handler(
          request({
            table: "gochati_payments",
            operation: "insert",
            payload: { status: "success" },
          }),
        )
      ).status,
    ).toBe(403);
  });
  it("rejects unknown table names", async () => {
    expect(
      (await handler(request({ table: "gochati_admin_emails", operation: "select" }))).status,
    ).toBe(400);
  });
  it("forbids sending chat messages as another user", async () => {
    expect(
      (
        await handler(
          request({
            table: "chat_messages",
            operation: "insert",
            payload: { user_id: "someone-else", sender: "user", partner_id: "Mia", body: "Hi" },
          }),
        )
      ).status,
    ).toBe(400);
  });
});
describe("SplashPay verification", () => {
  const payment = { order_id: "INV-reference", amount: 16000 };
  const valid = { reference: "INV-reference", amount: 16000, currency: "TZS", status: "success" };
  it("accepts a matching confirmed transaction", () =>
    expect(verifiedPaymentStatus(payment, valid)).toBe("success"));
  it.each([
    { reference: "different" },
    { amount: 1 },
    { currency: "USD" },
    { reference: undefined },
    { status: "unrecognized" },
  ])("rejects incomplete or mismatched provider data %j", (patch) => {
    expect(() => verifiedPaymentStatus(payment, { ...valid, ...patch })).toThrow();
  });
  it("preserves pending instead of marking it successful", () =>
    expect(verifiedPaymentStatus(payment, { ...valid, status: "pending" })).toBe("pending"));
});
