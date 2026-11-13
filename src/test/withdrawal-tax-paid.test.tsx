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

describe("withdrawal tier prompts", () => {
  it("asks a Normal account to upgrade after meeting the TZS 100,000 threshold, regardless of Tax Paid", async () => {
    mocks.profile.vip_tax_paid = false;
    render(<Page />);
    await screen.findByText("TZS 800,000");

    fireEvent.click(screen.getByRole("button", { name: "Withdrawal" }));

    expect(
      await screen.findByRole("heading", { name: /Hongera! Umefikia kiwango cha withdrawal/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lipa Premium — TZS 32,000" })).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("shows insufficient balance for a requested amount below TZS 100,000", async () => {
    render(<Page />);
    await screen.findByText("TZS 800,000");

    fireEvent.change(screen.getByLabelText("Kiasi (TZS)"), {
      target: { value: "90000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Withdrawal" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Salio halitoshi kufanya Withdrawal.",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("shows the insufficient-balance message below TZS 100,000", async () => {
    mocks.profile.balance = 99999;
    render(<Page />);
    await screen.findByText("TZS 99,999");

    fireEvent.click(screen.getByRole("button", { name: "Withdrawal" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Salio halitoshi kufanya Withdrawal.",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("asks Premium accounts with TZS 300,000 or more to upgrade to VIP", async () => {
    mocks.profile.balance = 300000;
    mocks.profile.is_premium = true;
    render(<Page />);
    await screen.findByText("TZS 300,000");

    fireEvent.click(screen.getByRole("button", { name: "Withdrawal" }));

    expect(
      await screen.findByRole("heading", { name: /Hongera! Umefikia kiwango cha VIP/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lipa VIP — TZS 35,500" })).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("shows the insufficient-balance message for Premium accounts below TZS 300,000", async () => {
    mocks.profile.balance = 299999;
    mocks.profile.is_premium = true;
    render(<Page />);
    await screen.findByText("TZS 299,999");

    fireEvent.click(screen.getByRole("button", { name: "Withdrawal" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Salio halitoshi kufanya Withdrawal.",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("shows the Tax dialog for VIP accounts that have not paid Tax", async () => {
    mocks.profile.is_vip = true;
    mocks.profile.vip_tax_paid = false;
    render(<Page />);
    await screen.findByText("VIP");
    expect(screen.queryByText(/Tax Paid:/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Withdrawal" }));

    expect(
      await screen.findByRole("heading", { name: "Malipo ya Tax ya VIP" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lipa Tax — TZS 50,000" })).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("submits a VIP withdrawal only after Tax is paid", async () => {
    mocks.profile.is_premium = true;
    mocks.profile.is_vip = true;
    mocks.profile.vip_tax_paid = true;
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

    fireEvent.click(screen.getByRole("button", { name: "Withdrawal" }));

    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith("gochati_request_withdrawal", {
        p_amount: 100000,
        p_phone: "0712345678",
      }),
    );
    expect(await screen.findByText("Pending")).toBeInTheDocument();
  });
});
