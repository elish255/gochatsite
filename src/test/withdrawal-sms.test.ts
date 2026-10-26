// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authenticated: vi.fn(),
  query: vi.fn(),
  send: vi.fn(),
  release: vi.fn(),
}));
vi.mock("../../netlify/lib/platform.js", async (original) => ({
  ...(await original<typeof import("../../netlify/lib/platform.js")>()),
  authenticated: mocks.authenticated,
}));
vi.mock("../../netlify/lib/darsms.js", () => ({ sendDarsms: mocks.send }));
import handler from "../../netlify/functions/gochati-data.mts";
const request = () =>
  handler(
    new Request("https://gochati.online/api/gochati-data", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "https://gochati.online" },
      body: JSON.stringify({
        table: "gochati_withdrawals",
        operation: "update",
        filters: { id: "withdrawal-one" },
        payload: { status: "paid" },
      }),
    }),
  );
beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticated.mockResolvedValue({
    user: { id: "admin" },
    isAdmin: true,
    db: { pool: { connect: async () => ({ query: mocks.query, release: mocks.release }) } },
  });
  mocks.query.mockImplementation(async (query: string) => ({
    rows: query.startsWith("UPDATE")
      ? [
          {
            id: "withdrawal-one",
            user_id: "amina-id",
            phone: "0712345678",
            amount: 15000,
            status: "paid",
          },
        ]
      : query.startsWith("SELECT username")
        ? [{ username: "amina" }]
        : [],
  }));
});
describe("Withdrawal Paid SMS", () => {
  it("sends the requested message using the committed withdrawal and username", async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledWith(
      "0712345678",
      "Hongera! amina Withdrawal yako ya TZS 15,000 imekamilika na malipo yako yametumwa kikamilifu. Asante kwa kutumia GOCHATI .!!!",
    );
    expect(mocks.query.mock.calls.some(([query]) => query === "COMMIT")).toBe(true);
    expect((await response.json()).data[0].sms_status).toBe("queued");
  });
  it("preserves Paid and reports SMS failure when the provider fails", async () => {
    mocks.send.mockRejectedValue(new Error("provider unavailable"));
    const response = await request();
    expect(response.status).toBe(200);
    expect((await response.json()).data[0].sms_status).toBe("failed");
    expect(mocks.query.mock.calls.some(([query]) => query === "ROLLBACK")).toBe(false);
  });
  it("does not send again when no pending withdrawal changes", async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    expect((await request()).status).toBe(200);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.query.mock.calls.find(([query]) => query.startsWith("UPDATE"))?.[0]).toContain(
      "status='pending'",
    );
  });
  it("rejects ordinary users without sending SMS", async () => {
    const current = await mocks.authenticated();
    mocks.authenticated.mockResolvedValue({ ...current, isAdmin: false });
    expect((await request()).status).toBe(403);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
