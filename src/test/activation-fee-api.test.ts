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
it("retires activation fee reads and updates", async () => {
  const response = await settings();
  expect(response.status).toBe(410);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).not.toHaveProperty("activation_fee");
  expect(mocks.sql).not.toHaveBeenCalled();
});
it("rejects activation charges before creating a payment", async () => {
  vi.stubGlobal("Netlify", { env: { get: () => "test-only" } });
  try {
    const response = await payment(request({ action: "create", purpose: "activation", amount: 16000, phone: "255712345678" }));
    expect(response.status).toBe(400);
    expect(mocks.sql).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
