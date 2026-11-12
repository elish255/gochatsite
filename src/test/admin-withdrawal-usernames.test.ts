import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  selectCalls: [] as Array<{ table: string; columns: string }>,
  isAdmin: true,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  }),
}));

let handler: typeof import("../../api/gochati-data").default;

beforeAll(async () => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  handler = (await import("../../api/gochati-data")).default;
});

type TestResponseBody = {
  data: Array<Record<string, unknown>>;
  message?: string;
};

function createResponse() {
  let statusCode = 0;
  let body: unknown;

  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(value: unknown) {
      body = value;
    },
  };

  return {
    response,
    getStatus: () => statusCode,
    getBody: () => body as TestResponseBody,
  };
}

describe("admin withdrawal usernames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdmin = true;
    mocks.selectCalls.length = 0;
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "admin-1" } },
      error: null,
    });
    mocks.from.mockImplementation((table: string) => {
      const result =
        table === "gochati_admins"
          ? {
              data: mocks.isAdmin ? { user_id: "admin-1" } : null,
              error: null,
            }
          : {
              data: [
                {
                  id: "withdrawal-1",
                  user_id: "customer-1",
                  amount: 20000,
                  account: {
                    username: "amina_01",
                    full_name: "Amina Juma",
                  },
                },
              ],
              error: null,
            };

      type QueryResult = { data: unknown; error: null };
      type QueryStub = {
        select: (columns?: string) => QueryStub;
        eq: (...args: unknown[]) => QueryStub;
        order: (...args: unknown[]) => QueryStub;
        limit: (...args: unknown[]) => QueryStub;
        maybeSingle: () => Promise<QueryResult>;
        then: (
          resolve: (value: QueryResult) => unknown,
          reject: (reason: unknown) => unknown,
        ) => Promise<unknown>;
      };
      const query = {} as QueryStub;
      query.select = (columns = "") => {
        mocks.selectCalls.push({ table, columns });
        return query;
      };
      query.eq = () => query;
      query.order = () => query;
      query.limit = () => query;
      query.maybeSingle = async () => result;
      query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);

      return query;
    });
  });

  it("returns the linked username and full name on admin withdrawal rows", async () => {
    const { response, getStatus, getBody } = createResponse();

    await handler(
      {
        method: "POST",
        headers: { authorization: "Bearer test-token" },
        body: { table: "gochati_withdrawals", operation: "select" },
      },
      response,
    );

    expect(getStatus(), JSON.stringify(getBody())).toBe(200);
    expect(getBody().data[0]).toMatchObject({
      id: "withdrawal-1",
      user_id: "customer-1",
      username: "amina_01",
      full_name: "Amina Juma",
    });
    expect(getBody().data[0]).not.toHaveProperty("account");
    expect(
      mocks.selectCalls.find((call) => call.table === "gochati_withdrawals")?.columns,
    ).toContain("gochati_users!gochati_withdrawals_user_id_fkey");
  });
});
