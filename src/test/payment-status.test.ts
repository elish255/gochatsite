// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ authenticated: vi.fn(), sql: vi.fn(), query: vi.fn() }));
vi.mock("../../netlify/lib/platform.js", async (original) => ({
  ...await original<typeof import("../../netlify/lib/platform.js")>(),
  authenticated: mocks.authenticated,
}));
import handler from "../../netlify/functions/gochati-payment.mts";
const reference = "INV-12345678-1234-1234-1234-123456789012";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("Netlify", { env: { get: () => "test-only" } });
  mocks.authenticated.mockResolvedValue({
    user: { id: "user-one" }, profile: {}, isAdmin: false,
    db: { sql: mocks.sql, pool: { connect: async () => ({ query: mocks.query, release: vi.fn() }) } },
  });
});
afterEach(() => vi.unstubAllGlobals());
it.each([
  ["activation", 16000, "activation_paid"],
  ["premium", 32000, "is_premium"],
  ["vip", 35500, "is_vip"],
])("activates %s only after a verified successful transaction", async (purpose, amount, column) => {
  mocks.sql.mockResolvedValue([{ id: "payment-one", user_id: "user-one", order_id: reference, amount, purpose, status: "pending" }]);
  mocks.query.mockImplementation(async (query: string) => ({ rows: query.startsWith("SELECT") ? [{ status: "pending" }] : [] }));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status: "success", data: { reference, amount, currency: "TZS", status: "successful" } })));
  const response = await handler(new Request("https://gochati.online/api/gochati-payment", {
    method: "POST", headers: { origin: "https://gochati.online", "Content-Type": "application/json" },
    body: JSON.stringify({ action: "status", reference }),
  }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ payment_status: "success" });
  const update = mocks.query.mock.calls.find(([query]) => query.startsWith("UPDATE gochati_users"));
  expect(update?.[0]).toContain(`"${column}"=true`);
  expect(update?.[0]).toContain("activation_paid");
  expect(update?.[0]).toContain("THEN 'active'");
  expect(mocks.query).toHaveBeenCalledWith("COMMIT");
});
