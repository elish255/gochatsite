import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/withdrawal";

const mocks = vi.hoisted(() => ({
  profile: {
    account_status: "inactive",
    activation_paid: false,
    balance: 800000,
    phone: "0712345678",
  },
  history: [] as any[],
  eligibility: { is_premium: false, is_vip: false, referrals: 10, active_referrals: 0 },
  rpc: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useNavigate: () => mocks.navigate,
}));
vi.mock("@/integrations/netlify/client", () => ({
  platform: {
    auth: { getUser: async () => ({ data: { user: { id: "current-user" } } }) },
    rpc: (name: string, args: unknown) =>
      name === "gochati_withdrawal_eligibility"
        ? Promise.resolve({ data: mocks.eligibility })
        : mocks.rpc(name, args),
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: mocks.profile }),
          order: async () => ({ data: mocks.history }),
        }),
      }),
    }),
  },
}));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.history = [];
  mocks.eligibility = { is_premium: false, is_vip: false, referrals: 10, active_referrals: 0 };
});

describe("Withdrawal account access", () => {
  it.each([
    { account_status: "inactive", activation_paid: true },
    { account_status: "active", activation_paid: false },
  ])(
    "opens activation dialog and blocks requests for $account_status / $activation_paid",
    async (profile) => {
      Object.assign(mocks.profile, profile);
      const Page = Route.options.component as () => React.JSX.Element;
      render(<Page />);
      expect(await screen.findByRole("dialog")).toHaveTextContent("HUWEZI KUTOA PESA");
      expect(screen.getByRole("dialog")).toHaveTextContent("Huwezi kutoa pesa kwa sasa kwa sababu huna kiasi cha kutosha cha kupokea huduma hii.");
      expect(screen.getByRole("dialog")).toHaveTextContent("Jisajili kwa mtaji wa 16,000, kisha kamilisha chat angalau moja ili uweze kulipwa kwa kuwafundisha wazungu Kiswahili.");
      expect(screen.getByRole("link", { name: /JISAJILI SASA/ })).toHaveAttribute(
        "href",
        "/register",
      );
      fireEvent.click(screen.getByRole("button", { name: "Rudi nyuma" }));
      fireEvent.click(screen.getByRole("button", { name: "Withdrawal" }));
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );

  it("shows insufficient balance in red", async () => {
    Object.assign(mocks.profile, { account_status: "active", activation_paid: true });
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    await screen.findByText("TZS 800,000");
    fireEvent.change(screen.getByLabelText("Kiasi (TZS)"), { target: { value: "800001" } });
    fireEvent.click(screen.getByRole("button", { name: "Withdrawal" }));
    expect(screen.getByRole("status")).toHaveTextContent("SALIO HALITOSHI");
    expect(screen.getByRole("status")).toHaveClass("text-destructive");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each(["20000", "800001", "25000.5"])("blocks invalid withdrawal amount %s", async (amount) => {
    Object.assign(mocks.profile, { account_status: "active", activation_paid: true });
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    await screen.findByText("TZS 800,000");
    fireEvent.change(screen.getByLabelText("Kiasi (TZS)"), { target: { value: amount } });
    fireEvent.click(screen.getByRole("button", { name: "Withdrawal" }));
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it.each([
    { is_premium: false, is_vip: false, referrals: 9, active_referrals: 0, tier: "premium" },
    { is_premium: true, is_vip: false, referrals: 10, active_referrals: 4, tier: "vip" },
  ])(
    "offers $tier upgrade when referral requirements are unmet",
    async ({ tier, ...eligibility }) => {
      Object.assign(mocks.profile, { account_status: "active", activation_paid: true });
      mocks.eligibility = eligibility;
      const Page = Route.options.component as () => React.JSX.Element;
      render(<Page />);
      await screen.findByText("TZS 800,000");
      fireEvent.click(screen.getByRole("button", { name: "Withdrawal" }));
      expect(await screen.findByRole("dialog")).toHaveTextContent("Vigezo vya withdrawal");
      expect(screen.getByRole("link", { name: "Upgrade" })).toHaveAttribute(
        "href",
        `/payment?type=${tier}`,
      );
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );

  it("shows Paid history in green without an activation dialog", async () => {
    Object.assign(mocks.profile, { account_status: "active", activation_paid: true });
    mocks.history = [
      { id: "withdrawal", amount: 25000, status: "paid", created_at: "2026-10-16T12:00:00Z" },
    ];
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    expect(await screen.findByText("Paid")).toHaveClass("text-success");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("allows an active paid account to request withdrawal without the dialog", async () => {
    Object.assign(mocks.profile, { account_status: "active", activation_paid: true });
    mocks.rpc.mockResolvedValue({ error: null });
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    await screen.findByText("TZS 800,000");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Withdrawal" }));
    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith("gochati_request_withdrawal", expect.any(Object)),
    );
  });
});
