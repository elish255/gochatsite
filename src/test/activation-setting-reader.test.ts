// @vitest-environment node
import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { activationFeeEnabled } from "@/lib/server/activation-policy";
function client(result: unknown) {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return { from: () => query } as unknown as SupabaseClient;
}
it("preserves enabled behavior until the migration exists", async () => {
  expect(await activationFeeEnabled(client({ error: { code: "42P01" } }))).toBe(true);
  expect(await activationFeeEnabled(client({ error: { code: "PGRST205" } }))).toBe(true);
  expect(await activationFeeEnabled(client({ data: null }))).toBe(true);
});
it("uses the stored boolean without a cache", async () => {
  expect(await activationFeeEnabled(client({ data: { enabled: false } }))).toBe(false);
  expect(await activationFeeEnabled(client({ data: { enabled: true } }))).toBe(true);
});
it("does not waive activation when a database read fails", async () => {
  await expect(
    activationFeeEnabled(client({ error: { code: "network_failure" } })),
  ).rejects.toEqual({ code: "network_failure" });
});
