import { expect, it } from "vitest";
import { hasActivationAccess, hasAccountAccess } from "@/lib/activation-policy";

it.each(["active", "pending", "inactive"])(
  "waives unpaid activation for %s only while disabled",
  (account_status) => {
    const profile = { account_status, activation_paid: false };
    expect(hasActivationAccess(profile)).toBe(false);
    expect(hasActivationAccess({ ...profile, activation_fee_enabled: false })).toBe(true);
    expect(hasActivationAccess({ ...profile, activation_fee_enabled: true })).toBe(false);
    expect(profile.activation_paid).toBe(false);
  },
);
it.each(["banned", "deactivated", "unknown"])("never bypasses %s accounts", (account_status) => {
  expect(
    hasActivationAccess({ account_status, activation_paid: true, activation_fee_enabled: false }),
  ).toBe(false);
});
it("retains paid access and existing withdrawal status behavior", () => {
  expect(hasActivationAccess({ account_status: "active", activation_paid: true })).toBe(true);
  expect(hasAccountAccess({ account_status: "active", activation_paid: false })).toBe(true);
  expect(hasActivationAccess(null)).toBe(false);
});
