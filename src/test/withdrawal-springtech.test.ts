// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAdmin: true,
  pending: true,
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    from: (table: string) => {
      if (table === "gochati_admins") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({
            data: mocks.isAdmin ? { user_id: "admin-1" } : null,
            error: null,
          }),
        };
        return query;
      }

      if (table === "gochati_users") {
        const query = {
          select: () => query,
          eq: () => query,
          maybeSingle: async () => ({ data: { username: "amina" }, error: null }),
        };
        return query;
      }

      const query = {
        update: () => query,
        eq: () => query,
        select: () => query,
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({
            data: mocks.pending
              ? [
                  {
                    id: "withdrawal-1",
                    user_id: "user-1",
                    phone: "0712345678",
                    amount: 150000,
                    status: "paid",
                  },
                ]
              : [],
            error: null,
          }).then(resolve),
      };
      return query;
    },
  }),
}));

let handler: typeof import("../../api/gochati-data").default;

beforeAll(async () => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "test-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  vi.stubEnv("SPRINGTECH_API_KEY", "spring-key");
  vi.stubEnv("SPRINGTECH_API_SECRET", "spring-secret");
  vi.stubEnv("SPRINGTECH_SENDER_ID", "GOCHATI");
  handler = (await import("../../api/gochati-data")).default;
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isAdmin = true;
  mocks.pending = true;
  mocks.getUser.mockResolvedValue({ data: { user: { id: "admin-1" } }, error: null });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true }),
  }));
});

async function updateWithdrawal() {
  let status = 200;
  let body: unknown;
  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    json(value: unknown) {
      body = value;
    },
  };

  await handler(
    {
      method: "POST",
      headers: { authorization: "Bearer test-token" },
      body: {
        table: "gochati_withdrawals",
        operation: "update",
        filters: { id: "withdrawal-1" },
        payload: { status: "paid", paid_at: "2026-11-27T00:00:00.000Z" },
      },
    },
    res,
  );
  return { status, body: body as { data: Array<Record<string, unknown>> } };
}

describe("SpringTech withdrawal SMS", () => {
  it("sends the Paid notification automatically and returns its delivery status", async () => {
    const result = await updateWithdrawal();

    expect(result.status).toBe(200);
    expect(result.body.data[0]?.sms_status).toBe("queued");
    expect(fetch).toHaveBeenCalledOnce();
    const [, request] = vi.mocked(fetch).mock.calls[0]!;
    expect(request?.headers).toMatchObject({ api_key: "spring-key", api_secret: "spring-secret" });
    expect(JSON.parse(String(request?.body))).toMatchObject({
      senderId: "GOCHATI",
      messageType: "text",
      contacts: "+255712345678",
      message: expect.stringContaining("Withdrawal yako ya TZS 150,000 imekamilika."),
    });
  });

  it("does not send another SMS when the withdrawal is no longer pending", async () => {
    mocks.pending = false;
    const result = await updateWithdrawal();

    expect(result.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
    expect(result.body.data).toEqual([]);
  });

  it("keeps the Paid update and reports SMS failure if SpringTech rejects it", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503, json: async () => ({ success: false }) } as Response);
    const result = await updateWithdrawal();

    expect(result.status).toBe(200);
    expect(result.body.data[0]?.sms_status).toBe("failed");
  });
});
