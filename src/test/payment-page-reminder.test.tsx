import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/payment";

const mocks = vi.hoisted(() => ({
  profile: {
    account_status: "active",
    balance: 800000,
    is_premium: false,
    is_vip: false,
    vip_tax_paid: false,
  },
  navigate: vi.fn(),
}));

type MockQuery = {
  select: (...args: unknown[]) => MockQuery;
  eq: (...args: unknown[]) => MockQuery;
  maybeSingle: () => Promise<{ data: typeof mocks.profile; error: null }>;
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/integrations/supabase/platform", () => ({
  platform: {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }),
    },
    from: () => {
      const query: MockQuery = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: { ...mocks.profile }, error: null }),
      };
      return query;
    },
  },
}));

const Page = Route.options.component as ComponentType;
const reminderText = "Hakikisha Namba uliyoweka Ina Salio la kutosha kabla ya kugusa LIPA Sasa";

beforeEach(() => {
  Object.assign(mocks.profile, {
    account_status: "active",
    balance: 800000,
    is_premium: false,
    is_vip: false,
    vip_tax_paid: false,
  });
  mocks.navigate.mockReset();
});

afterEach(cleanup);

describe("payment balance reminder", () => {
  it.each([
    { type: "premium", is_premium: false, is_vip: false },
    { type: "vip", is_premium: true, is_vip: false },
    { type: "tax", is_premium: true, is_vip: true },
  ] as const)("shows the red balance reminder on the $type payment page", async (profile) => {
    Object.assign(mocks.profile, profile);
    window.history.pushState({}, "", `/payment?type=${profile.type}`);

    render(<Page />);

    const reminder = await screen.findByText(reminderText);
    expect(reminder).toHaveClass("text-destructive");
    expect(screen.getByRole("button", { name: /LIPA/ })).toBeInTheDocument();
  });
});
