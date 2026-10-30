// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  query: vi.fn(),
  release: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock("../../netlify/lib/platform.js", async (original) => ({
  ...(await original<typeof import("../../netlify/lib/platform.js")>()),
  authenticated: mocks.authenticated,
}));
vi.mock("@netlify/identity", () => ({ admin: { deleteUser: mocks.deleteUser } }));
import handler from "../../netlify/functions/gochati-data.mts";
const target = "10000000-0000-4000-8000-000000000001";
const second = "10000000-0000-4000-8000-000000000002";
const request = (ids: unknown = [target]) =>
  handler(
    new Request("https://gochati.online/api/gochati-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rpc: "gochati_admin_delete_users", args: { user_ids: ids } }),
    }),
  );
beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticated.mockResolvedValue({
    isAdmin: true,
    user: { id: "admin" },
    db: { pool: { connect: async () => ({ query: mocks.query, release: mocks.release }) } },
  });
  mocks.query.mockImplementation(async (sql: string) => ({
    rows: sql.includes("FOR UPDATE") ? [{ id: target }] : [],
  }));
});
describe("Admin account deletion", () => {
  it("rejects non-admins before accessing the database or Identity", async () => {
    mocks.authenticated.mockResolvedValue({ isAdmin: false });
    expect((await request()).status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it.each([{ ids: [] }, { ids: ["invalid"] }, { ids: Array(101).fill(target) }])(
    "rejects invalid selection %j",
    async ({ ids }) => {
      expect((await request(ids)).status).toBe(400);
      expect(mocks.deleteUser).not.toHaveBeenCalled();
    },
  );
  it("protects admin accounts", async () => {
    mocks.query.mockResolvedValue({ rows: [{ id: target }] });
    expect((await request()).status).toBe(403);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it("deletes Identity and dependent records, preserves an audit and blocks recreation", async () => {
    const response = await request([target, target]);
    expect(await response.json()).toEqual({ data: { deleted: [target], failed: [] } });
    expect(mocks.deleteUser).toHaveBeenCalledExactlyOnceWith(target);
    for (const table of [
      "gochati_payments",
      "gochati_withdrawals",
      "gochati_notifications",
      "chat_messages",
      "gochati_earning_sessions",
      "gochati_users",
    ]) {
      expect(mocks.query).toHaveBeenCalledWith(
        `DELETE FROM ${table} WHERE ${table === "gochati_users" ? "id" : "user_id"}=$1`,
        [target],
      );
    }
    expect(
      mocks.query.mock.calls.some(([sql]) => sql.includes("INSERT INTO gochati_deleted_users")),
    ).toBe(true);
    expect(
      mocks.query.mock.calls.some(([sql]) => sql.includes("INSERT INTO gochati_admin_audit")),
    ).toBe(true);
    expect(mocks.query).toHaveBeenCalledWith("COMMIT");
    expect(mocks.release).toHaveBeenCalled();
  });
  it("keeps failed users for retry and reports partial success", async () => {
    mocks.deleteUser.mockRejectedValueOnce(new Error("Identity unavailable"));
    const response = await request([target, second]);
    expect(await response.json()).toEqual({ data: { deleted: [second], failed: [target] } });
    expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mocks.query).not.toHaveBeenCalledWith("DELETE FROM gochati_users WHERE id=$1", [target]);
  });
  it("can retry cleanup if Identity was already deleted", async () => {
    mocks.deleteUser.mockRejectedValue({ status: 404 });
    expect((await (await request()).json()).data.deleted).toEqual([target]);
  });
});
