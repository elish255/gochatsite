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
  it("includes the account username in admin withdrawal reads", async () => {
    const current = await mocks.authenticated();
    mocks.authenticated.mockResolvedValue({ ...current, isAdmin: true });
    const response = await handler(
      request({ table: "gochati_withdrawals", operation: "select" }),
    );
    expect(response.status).toBe(200);
    expect(mocks.query.mock.calls[0]?.[0]).toContain(
      "(SELECT username FROM gochati_users WHERE gochati_users.id = gochati_withdrawals.user_id) AS username",
    );
  });

  it("keeps ordinary withdrawal reads scoped without the admin username lookup", async () => {
    const response = await handler(
      request({ table: "gochati_withdrawals", operation: "select" }),
    );
    expect(response.status).toBe(200);
    expect(mocks.query.mock.calls[0]?.[0]).not.toContain("AS username");
    expect(mocks.query.mock.calls[0]?.[0]).toContain("user_id=$1");
  });

  it("forbids ordinary users from searching the user directory", async () => {
    expect(
      (await handler(request({ table: "gochati_users", operation: "select", search: "Amina" })))
        .status,
    ).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("lets administrators search names, usernames and phone numbers with parameters", async () => {
    const current = await mocks.authenticated();
    mocks.authenticated.mockResolvedValue({ ...current, isAdmin: true });
    const response = await handler(
      request({ table: "gochati_users", operation: "select", search: "amina_" }),
    );
    expect(response.status).toBe(200);
    expect(mocks.query.mock.calls[0]?.[0]).toContain(
      "full_name ILIKE $1 OR username ILIKE $1 OR phone ILIKE $1",
    );
    expect(mocks.query.mock.calls[0]?.[1]).toEqual(["%amina\\_%", 100]);
  });
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
describe("Earning and withdrawal rules", () => {
  it("normalizes SplashPay successful status after verifying transaction details", () => {
    expect(verifiedPaymentStatus(
      { order_id: "INV-example", amount: 16000 },
      { reference: "INV-example", amount: 16000, currency: "TZS", status: "successful" },
    )).toBe("success");
  });

  it.each([
    [1, 5000],
    [5, 25000],
  ])("accepts %i minute sessions for %i", async (minutes, amount) => {
    mocks.sql.mockResolvedValue([{ id: "session" }]);
    const response = await handler(
      request({
        rpc: "gochati_start_earning_session",
        args: { p_minutes: minutes, p_amount: amount, p_partner: "person-1" },
      }),
    );
    expect(response.status).toBe(200);
  });
  it.each([
    [10, 25000],
    [1, 25000],
    [5, 100000],
  ])("rejects unsupported session %i / %i", async (minutes, amount) => {
    const response = await handler(
      request({
        rpc: "gochati_start_earning_session",
        args: { p_minutes: minutes, p_amount: amount, p_partner: "person-1" },
      }),
    );
    expect(response.status).toBe(400);
    expect(mocks.sql).not.toHaveBeenCalled();
  });
  it.each([20000, 0, 25000.5])("rejects withdrawal amount %i", async (amount) => {
    expect(
      (
        await handler(
          request({
            rpc: "gochati_request_withdrawal",
            args: { p_amount: amount, p_phone: "0712345678" },
          }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.sql).not.toHaveBeenCalled();
  });
  it.each([
    { is_premium: false, total: 9, active: 5 },
    { is_premium: true, total: 10, active: 4 },
  ])(
    "enforces membership referral requirements on the server %j",
    async ({ is_premium, total, active }) => {
      const current = await mocks.authenticated();
      mocks.authenticated.mockResolvedValue({
        ...current,
        profile: { ...current.profile, is_premium },
      });
      mocks.sql.mockResolvedValueOnce([{ total, active }]);
      expect(
        (
          await handler(
            request({
              rpc: "gochati_request_withdrawal",
              args: { p_amount: 500000, p_phone: "0712345678" },
            }),
          )
        ).status,
      ).toBe(403);
      expect(mocks.sql).toHaveBeenCalledTimes(1);
    },
  );
  it("blocks non-admin broadcasts", async () => {
    expect(
      (
        await handler(
          request({ rpc: "gochati_broadcast", args: { audience: "all", message: "Habari" } }),
        )
      ).status,
    ).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("accepts a funded withdrawal at the minimum", async () => {
    mocks.sql
      .mockResolvedValueOnce([{ total: 10, active: 5 }])
      .mockResolvedValueOnce([{ id: "withdrawal" }]);
    expect(
      (
        await handler(
          request({
            rpc: "gochati_request_withdrawal",
            args: { p_amount: 500000, p_phone: "0712345678" },
          }),
        )
      ).status,
    ).toBe(200);
  });
  it("rejects insufficient funds without creating a request", async () => {
    mocks.sql.mockResolvedValueOnce([{ total: 10, active: 5 }]).mockResolvedValueOnce([]);
    expect(
      (
        await handler(
          request({
            rpc: "gochati_request_withdrawal",
            args: { p_amount: 500000, p_phone: "0712345678" },
          }),
        )
      ).status,
    ).toBe(409);
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


describe("VIP withdrawal lifecycle", () => {
  it.each([false, true])("accepts VIP with no referrals (premium=%s)", async (is_premium) => {
    const current = await mocks.authenticated();
    mocks.authenticated.mockResolvedValue({ ...current, profile: { ...current.profile, is_vip: true, is_premium } });
    mocks.sql.mockResolvedValueOnce([{ total: 0, active: 0 }]).mockResolvedValueOnce([{ id: "withdrawal" }]);
    const response = await handler(request({ rpc: "gochati_request_withdrawal", args: { p_amount: 500000, p_phone: "+255712345678" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: "withdrawal" });
    expect(mocks.sql.mock.calls[1][0].join(" ")).toContain("'pending'");
  });
  it("rejects malformed phone numbers before debiting", async () => {
    const response = await handler(request({ rpc: "gochati_request_withdrawal", args: { p_amount: 500000, p_phone: "ddddddddd" } }));
    expect(response.status).toBe(400);
    expect(mocks.sql).not.toHaveBeenCalled();
  });
  it("forbids users from marking their withdrawals paid", async () => {
    const response = await handler(request({ table: "gochati_withdrawals", operation: "update", filters: { id: "withdrawal" }, payload: { status: "paid" } }));
    expect(response.status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("allows admin to mark only pending withdrawals paid", async () => {
    const current = await mocks.authenticated();
    mocks.authenticated.mockResolvedValue({ ...current, isAdmin: true });
    const response = await handler(request({ table: "gochati_withdrawals", operation: "update", filters: { id: "withdrawal" }, payload: { status: "paid" } }));
    expect(response.status).toBe(200);
    const update = mocks.query.mock.calls.find(([query]) => query.startsWith("UPDATE"));
    expect(update?.[0]).toContain("status='pending'");
    expect(update?.[1]).toContain("paid");
  });
});
