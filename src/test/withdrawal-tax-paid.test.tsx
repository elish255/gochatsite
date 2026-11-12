import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/withdrawal";

const mocks = vi.hoisted(() => ({
  profile: {
    balance: 800000,
    phone: "0712345678",
    account_status: "active",
    activation_paid: true,
    is_premium: false,
    is_vip: false,
    vip_tax_paid: true,
  },
  history: [] as Array<Record<string, unknown>>,
  navigate: vi.fn(),
  rpc: vi.fn(),
}));

type MockQuery = {
  select: (...args: unknown[]) => MockQuery;
  eq: (...args: unknown[]) => MockQuery;
  single: () => Promise<{ data: typeof mocks.profile; error: null }>;
  order: (...args: unknown[]) => Promise<{
    data: Array<Record<string, unknown>>;
    error: null;
  }>;
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
        single: async () => ({ data: { ...mocks.profile }, error: null }),
        order: async () => ({ data: [...mocks.history], error: null }),
      };
      return query;
    },
    rpc: (...args: unknown[]) => mocks.rpc(...args),
  },
}));

const Page = Route.options.component as ComponentType;

beforeEach(() => {
  Object.assign(mocks.profile, {
    balance: 800000,
    phone: "0712345678",
    account_status: "active",
    activation_paid: true,
    is_premium: false,
    is_vip: false,
    vip_tax_paid: true,
  });
  mocks.history = [];
  mocks.navigate.mockReset();
  mocks.rpc.mockReset();
});

afterEach(cleanup);

describe("admin-confirmed Tax Paid withdrawals", () => {
  it("submits a non-premium, non-VIP user's request as Pending", async () => {
    mocks.rpc.mockImplementation(async () => {
      mocks.history = [
        {
          id: "withdrawal-1",
          amount: 100000,
          fee: 20000,
          net_amount: 80000,
          phone: "0712345678",
          status: "pending",
          created_at: "2026-11-12T12:00:00Z",
        },
      ];
      return { data: "withdrawal-1", error: null };
    });

    render(<Page />);
    await screen.findByText("TZS 800,000");
    expect(screen.getByText(/Tax Paid: Imelipwa/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Withdrawal" }));

    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith("gochati_request_withdrawal", {
        p_amount: 100000,
        p_phone: "0712345678",
      }),
    );
    expect(await screen.findByText("Pending")).toBeInTheDocument();
  });

  it("blocks withdrawal until an admin marks Tax Paid", async () => {
    mocks.profile.vip_tax_paid = false;

    render(<Page />);
    await screen.findByText("Tax Paid: Haijawekwa");

    expect(screen.getByRole("button", { name: "Withdrawal" })).toBeDisabled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
