// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ authenticated: vi.fn(), sql: vi.fn() }));
vi.mock("@netlify/database", () => ({ getDatabase: () => ({ sql: mocks.sql }) }));
vi.mock("../../netlify/lib/platform.js", async original => ({
  ...await original<typeof import("../../netlify/lib/platform.js")>(), authenticated: mocks.authenticated,
}));
import settings from "../../netlify/functions/gochati-settings.mts";
import payment from "../../netlify/functions/gochati-payment.mts";
const request = (body: unknown) => new Request("https://gochati.online/api/gochati-settings", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.sql.mockResolvedValue([{ activation_fee: 22000 }]);
  mocks.authenticated.mockResolvedValue({ db: { sql: mocks.sql }, user: { id: "admin" }, profile: {}, isAdmin: true });
});
it("publishes the saved fee without caching", async () => {
  const response = await settings(new Request("https://gochati.online/api/gochati-settings"));
  expect(await response.json()).toEqual({ activation_fee: 22000 });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
it("prevents non-admin updates", async () => {
  mocks.authenticated.mockResolvedValue({ isAdmin: false });
  expect((await settings(request({ activation_fee: 22000 }))).status).toBe(403);
  expect(mocks.sql).not.toHaveBeenCalled();
});
it.each([0, -1, 2.5, 10000001, "22000", null])("rejects invalid fee %s", async activation_fee => {
  expect((await settings(request({ activation_fee }))).status).toBe(400);
  expect(mocks.sql).not.toHaveBeenCalled();
});
it("saves the fee and audit entry atomically", async () => {
  const response = await settings(request({ activation_fee: 22000 }));
  expect(response.status).toBe(200);
  expect(mocks.sql.mock.calls[0]?.[0].join("")).toContain("gochati_admin_audit");
});
it("rejects an outdated activation quote before creating a payment", async () => {
  vi.stubGlobal("Netlify", { env: { get: () => "test-only" } });
  try {
    const response = await payment(request({ action: "create", purpose: "activation", amount: 16000, phone: "255712345678" }));
    expect(response.status).toBe(400);
    expect(mocks.sql).toHaveBeenCalledTimes(1);
  } finally { vi.unstubAllGlobals(); }
});
