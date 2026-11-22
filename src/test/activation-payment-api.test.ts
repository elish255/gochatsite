// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ enabled: vi.fn(), insert: vi.fn(), status: "inactive" }));
vi.mock("../../src/lib/server/activation-policy.js", () => ({
  activationFeeEnabled: mocks.enabled,
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({
          data:
            table === "gochati_users"
              ? {
                  account_status: mocks.status,
                  activation_paid: false,
                  balance: 200000,
                }
              : table === "gochati_payment_prices"
                ? { amount: 16000 }
                : null,
          error: null,
        }),
        insert: mocks.insert,
      };
      return query;
    },
  }),
}));
import handler from "../../api/gochati-payment";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.status = "inactive";
  mocks.enabled.mockResolvedValue(false);
  for (const key of [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SPLASHPAY_API_KEY",
    "SPLASHPAY_API_SECRET",
  ])
    vi.stubEnv(key, "test");
});
afterEach(() => vi.unstubAllEnvs());
async function invoke() {
  let status = 200;
  const res = {
    status: (code: number) => {
      status = code;
      return res;
    },
    json: vi.fn(),
  };
  await handler(
    {
      method: "POST",
      headers: { authorization: "Bearer test" },
      body: { action: "create", purpose: "activation", amount: 16000, phone: "255712345678" },
    },
    res,
  );
  return status;
}
it("rejects activation payment creation while disabled", async () => {
  expect(await invoke()).toBe(409);
  expect(mocks.insert).not.toHaveBeenCalled();
});
it.each(["banned", "deactivated"])(
  "does not allow activation payments to reopen a %s account",
  async (status) => {
    mocks.status = status;
    expect(await invoke()).toBe(403);
    expect(mocks.insert).not.toHaveBeenCalled();
  },
);
