import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@netlify/functions";

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  login: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  sendDarsms: vi.fn(),
  waitUntil: vi.fn(),
}));
vi.mock("../../netlify/lib/admin-push.js", () => ({ deliverAdminPush: async () => {} }));
vi.mock("../../netlify/lib/darsms.js", () => ({ sendDarsms: mocks.sendDarsms }));
vi.mock("@netlify/database", () => ({ getDatabase: () => ({ sql: mocks.sql }) }));
vi.mock("@netlify/identity", () => ({
  login: mocks.login,
  admin: { createUser: mocks.createUser, deleteUser: mocks.deleteUser },
  verifyRequestOrigin: () => {},
  getIdentityConfig: () => null,
}));
import handler from "../../netlify/functions/gochati-auth.mts";

function request(body: Record<string, unknown>) {
  return handler(
    new Request("https://gochati.online/api/gochati-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://gochati.online" },
      body: JSON.stringify(body),
    }),
    { ip: "192.0.2.5", waitUntil: mocks.waitUntil } as unknown as Context,
  );
}
const signup = {
  action: "register",
  username: "amina",
  email: "amina@example.test",
  password: "example-password",
  agree_terms: true,
  metadata: {
    full_name: "Amina Said",
    phone: "0712345678",
    country: "Tanzania",
    app_metadata: { roles: ["admin"] },
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.sql.mockImplementation(async (strings: TemplateStringsArray) => strings.join("").includes("SELECT activation_fee") ? [{ activation_fee: 22000 }] : []).mockResolvedValueOnce([{ attempts: 1 }]);
  mocks.createUser.mockResolvedValue({ id: "new-account" });
  mocks.login.mockResolvedValue({ id: "new-account" });
  mocks.sendDarsms.mockResolvedValue({ success: true });
});

describe("Username authentication and direct signup", () => {
  it("resolves a username on the server and returns no email or session credentials", async () => {
    mocks.sql
      .mockReset()
      .mockResolvedValueOnce([{ attempts: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ email: "amina@example.test" }]);
    const response = await request({
      action: "login",
      username: " AMINA ",
      password: "example-password",
    });
    expect(response.status).toBe(200);
    expect(mocks.login).toHaveBeenCalledWith("amina@example.test", "example-password");
    expect(await response.json()).toEqual({ data: true });
    expect(mocks.sendDarsms).not.toHaveBeenCalled();
  });
  it("uses the same error for unknown usernames and incorrect passwords", async () => {
    mocks.login.mockRejectedValue(new Error("Invalid credentials"));
    const response = await request({
      action: "login",
      username: "unknown",
      password: "example-password",
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Username au password si sahihi." });
  });
  it("creates an auto-confirmed account, saves the profile, then logs in", async () => {
    const response = await request(signup);
    expect(response.status).toBe(201);
    expect(mocks.createUser).toHaveBeenCalledWith({
      email: signup.email,
      password: signup.password,
      data: {
        user_metadata: {
          username: "amina",
          full_name: "Amina Said",
          phone: "0712345678",
          country: "Tanzania",
          referral_username: null,
        },
      },
    });
    const insert = mocks.sql.mock.calls.findIndex(([parts]) =>
      parts.join("").includes("INSERT INTO gochati_users"),
    );
    expect(insert).toBeGreaterThan(-1);
    expect(mocks.sql.mock.calls[insert]![0].join("")).toContain("account_status,activation_paid");
    expect(mocks.sql.mock.calls[insert]![0].join("")).toContain("'active',true");
    expect(mocks.sql.mock.invocationCallOrder[insert]).toBeLessThan(
      mocks.login.mock.invocationCallOrder[0]!,
    );
    expect(mocks.sql.mock.invocationCallOrder[insert]).toBeLessThan(
      mocks.sendDarsms.mock.invocationCallOrder[0]!,
    );
    expect(mocks.sendDarsms).toHaveBeenCalledExactlyOnceWith(
      signup.metadata.phone,
      "Hongera! amina Usajili wako wa GOCHATI umekamilika. Akaunti yako iko active. Endelea kuchat na kufundisha Kiswahili hapa: https://gochati.online/login",
    );
    expect(mocks.waitUntil).toHaveBeenCalledWith(expect.any(Promise));
  });
  it("keeps signup successful when the SMS provider fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mocks.sendDarsms.mockRejectedValue(new Error("provider unavailable"));
      expect((await request(signup)).status).toBe(201);
      await Promise.all(mocks.waitUntil.mock.calls.map(([promise]) => promise));
      expect(mocks.login).toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith("Registration SMS delivery failed.");
    } finally {
      log.mockRestore();
    }
  });
  it("rejects public signup for a reserved administrator email", async () => {
    mocks.sql
      .mockReset()
      .mockResolvedValueOnce([{ attempts: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ email: signup.email }])
      .mockResolvedValueOnce([]);
    expect((await request(signup)).status).toBe(409);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
  it("does not leave a newly created Identity account after a profile conflict", async () => {
    mocks.sql
      .mockReset()
      .mockResolvedValueOnce([{ attempts: 1 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce({ code: "23505" });
    expect((await request(signup)).status).toBe(409);
    expect(mocks.deleteUser).toHaveBeenCalledWith("new-account");
    expect(mocks.login).not.toHaveBeenCalled();
    expect(mocks.sendDarsms).not.toHaveBeenCalled();
  });
  it("limits repeated registration requests before creating an account", async () => {
    mocks.sql.mockReset().mockResolvedValueOnce([{ attempts: 11 }]);
    expect((await request(signup)).status).toBe(429);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
  it("blocks banned phone numbers before creating an Identity account", async () => {
    mocks.sql.mockImplementation(async (parts: TemplateStringsArray, ...values: unknown[]) => {
      const query = parts.join("");
      if (query.includes("INSERT INTO gochati_auth_limits")) return [{ attempts: 1 }];
      if (query.includes("FROM gochati_phone_bans")) {
        expect(values).toContain("255712345678");
        return [{ phone: "255712345678" }];
      }
      return [];
    });
    expect((await request(signup)).status).toBe(403);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.login).not.toHaveBeenCalled();
  });
  it("requires acceptance of terms on the server", async () => {
    expect((await request({ ...signup, agree_terms: false })).status).toBe(400);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
});
