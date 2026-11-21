// @vitest-environment node
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: true, from: vi.fn(), update: vi.fn(), enabled: true }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } } }) },
    from: (table: string) => {
      mocks.from(table);
      const result = () => ({
        data:
          table === "gochati_admins"
            ? mocks.admin
              ? { user_id: "user-1" }
              : null
            : table === "gochati_users"
              ? { account_status: "pending", activation_paid: false }
              : { enabled: mocks.enabled },
        error: null,
      });
      const query = {
        select: () => query,
        eq: () => query,
        limit: () => query,
        maybeSingle: async () => result(),
        single: async () => result(),
        update: (payload: { enabled: boolean }) => {
          mocks.update(payload);
          mocks.enabled = payload.enabled;
          return query;
        },
      };
      return query;
    },
  }),
}));
let handler: typeof import("../../api/gochati-data").default;
beforeAll(async () => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test");
  handler = (await import("../../api/gochati-data")).default;
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.admin = true;
  mocks.enabled = true;
});
async function invoke(body: unknown, authorization = "Bearer test") {
  let status = 200;
  let value: unknown;
  const res = {
    status: (code: number) => {
      status = code;
      return res;
    },
    json: (data: unknown) => {
      value = data;
    },
  };
  await handler({ method: "POST", headers: { authorization }, body }, res);
  return { status, value };
}
it("rejects unauthenticated writes", async () => {
  expect(
    (
      await invoke(
        { table: "gochati_activation_settings", operation: "update", payload: { enabled: false } },
        "",
      )
    ).status,
  ).toBe(401);
  expect(mocks.update).not.toHaveBeenCalled();
});
it("rejects non-admin writes", async () => {
  mocks.admin = false;
  expect(
    (
      await invoke({
        table: "gochati_activation_settings",
        operation: "update",
        payload: { enabled: false },
      })
    ).status,
  ).toBe(403);
  expect(mocks.update).not.toHaveBeenCalled();
});
it("validates booleans and restricts persisted fields", async () => {
  expect(
    (
      await invoke({
        table: "gochati_activation_settings",
        operation: "update",
        payload: { enabled: "false" },
      })
    ).status,
  ).toBe(400);
  const result = await invoke({
    table: "gochati_activation_settings",
    operation: "update",
    payload: { enabled: false, activation_paid: true },
  });
  expect(result).toEqual({ status: 200, value: { data: { enabled: false } } });
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({ enabled: false, updated_by: "user-1" }),
  );
  expect(mocks.update.mock.calls[0]?.[0]).not.toHaveProperty("activation_paid");
});

it("returns the effective policy without changing raw payment or account state", async () => {
  mocks.enabled = false;
  const result = await invoke({ table: "gochati_users", operation: "select", one: true });
  expect(result).toEqual({
    status: 200,
    value: {
      data: {
        account_status: "pending",
        activation_paid: false,
        activation_fee_enabled: false,
      },
    },
  });
  expect(mocks.update).not.toHaveBeenCalled();
});
