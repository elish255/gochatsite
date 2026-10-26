import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticated: vi.fn(), query: vi.fn(), send: vi.fn() }));
vi.mock("../../netlify/lib/platform.js", () => ({
  authenticated: mocks.authenticated,
  checkRequest: vi.fn(),
  assert: (value: unknown, status: number, message: string) => {
    if (!value) throw Object.assign(new Error(message), { status });
  },
  json: (data: unknown) => Response.json(data),
  fail: (error: Error & { status?: number }) =>
    Response.json({ message: error.message }, { status: error.status || 500 }),
}));
vi.mock("../../netlify/lib/darsms.js", () => ({
  normalizeTanzaniaPhone: (value: string) => value,
  sendDarsms: mocks.send,
}));
import handler from "../../netlify/functions/gochati-sms.mts";

const request = () =>
  handler(
    new Request("https://gochati.online/api/gochati-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "nf_jwt=test-session" },
      body: JSON.stringify({ action: "counts" }),
    }),
  );

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticated.mockResolvedValue({
    db: { pool: { query: mocks.query } },
    user: { id: "admin" },
    isAdmin: true,
  });
});

describe("SMS audience counts", () => {
  it("returns database totals for every group without sending SMS or requiring provider configuration", async () => {
    const counts = {
      all: 6000,
      active: 2400,
      inactive: 3600,
      normal: 5000,
      premium: 800,
      vip: 200,
    };
    mocks.query.mockResolvedValue({ rows: [counts] });
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ counts });
    expect(mocks.query.mock.calls[0]?.[0]).toContain("COUNT(*) FILTER");
    expect(mocks.query.mock.calls[0]?.[0]).not.toContain("LIMIT");
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects non-admin access before querying audience totals", async () => {
    mocks.authenticated.mockResolvedValue({ isAdmin: false });
    expect((await request()).status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});

afterEach(() => vi.unstubAllEnvs());
it("selects one user by a parameter and personalizes their SMS", async () => {
  vi.stubEnv("DARSMS_API_KEY", "test-only");
  const sql = vi.fn().mockResolvedValue([]);
  mocks.authenticated.mockResolvedValue({
    db: { pool: { query: mocks.query }, sql },
    user: { id: "admin" },
    isAdmin: true,
  });
  mocks.query.mockResolvedValue({ rows: [{ username: "amina", phone: "255712345678" }] });
  const response = await handler(
    new Request("https://gochati.online/api/gochati-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: "nf_jwt=test-session" },
      body: JSON.stringify({
        action: "send",
        audience: "individual",
        user_id: "amina-id",
        message: "Habari [Username]",
      }),
    }),
  );
  expect(response.status).toBe(200);
  expect(mocks.query).toHaveBeenCalledWith(
    "SELECT username, phone FROM gochati_users WHERE id::text=$1",
    ["amina-id"],
  );
  expect(mocks.send).toHaveBeenCalledExactlyOnceWith("255712345678", "Habari amina");
  expect((await response.json()).queued).toBe(1);
});
