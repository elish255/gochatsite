import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/withdrawal";


const mocks = vi.hoisted(() => ({
  profile: {
    account_status: "inactive",
  activation_paid: false,
  vip_tax_paid: true,
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
vi.mock("@/integrations/supabase/platform", () => ({
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
    { account_status: "deactivated", activation_paid: false },
  ])(
    "opens account access dialog and blocks requests for $account_status / $activation_paid",
    async (profile) => {
      Object.assign(mocks.profile, profile);
      const Page = Route.options.component as () => React.JSX.Element;
      render(<Page />);
      expect(await screen.findByRole("dialog")).toHaveTextContent("JISAJILI ILI KUENDELEA");
      expect(screen.getByRole("dialog")).toHaveTextContent("Jisajili sasa kuweza kuendelea kuchat na kulipwa.");
      expect(screen.getByRole("dialog")).toHaveTextContent("Akaunti yako inakuwa active moja kwa moja baada ya kujisajili.");
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
      fireEvent.change(screen.getByLabelText("Kiasi (TZS)"), { target: { value: "500000" } });
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

  it("allows an active account without an activation payment to request withdrawal without the dialog", async () => {
    Object.assign(mocks.profile, { account_status: "active", activation_paid: false });
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


  it("keeps the button clickable while tax status is unconfirmed but blocks the request", async () => {
    Object.assign(mocks.profile, {
      account_status: "active",
      activation_paid: false,
      vip_tax_paid: false,
    });
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    await screen.findByText("TZS 800,000");

    const withdrawalButton = screen.getByRole("button", { name: "Withdrawal" });
    expect(withdrawalButton).toBeEnabled();
    fireEvent.click(withdrawalButton);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Akaunti yako bado haijaruhusiwa kufanya withdrawal.",
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps the withdrawal button clickable and shows the cooldown countdown", async () => {
    Object.assign(mocks.profile, {
      account_status: "active",
      activation_paid: true,
      vip_tax_paid: true,
    });
    mocks.history = [
      {
        id: "recent-withdrawal",
        amount: 100000,
        status: "pending",
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    ];
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    await screen.findByText("TZS 800,000");

    const withdrawalButton = screen.getByRole("button", { name: "Withdrawal" });
    expect(withdrawalButton).toBeEnabled();
    expect(screen.getByRole("timer")).toBeInTheDocument();

    fireEvent.click(withdrawalButton);
    expect(await screen.findByRole("status")).toHaveTextContent("Bado huwezi kufanya withdrawal");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps a VIP request pending and refreshes history and the open receipt when admin marks paid", async () => {
  Object.assign(mocks.profile, { account_status: "active", activation_paid: true });
  mocks.eligibility = { is_premium: true, is_vip: true, referrals: 0, active_referrals: 0 };
  mocks.rpc.mockImplementation(async () => {
    mocks.history = [{ id: "vip-withdrawal", amount: 500000, fee: 100000, net_amount: 400000, phone: "0712345678", status: "pending", created_at: "2026-10-26T12:00:00Z" }];
    return { data: "vip-withdrawal", error: null };
  });
  const Page = Route.options.component as () => React.JSX.Element;
  render(<Page />);
  await screen.findByText("TZS 800,000");
  fireEvent.change(screen.getByLabelText("Kiasi (TZS)"), { target: { value: "500000" } });
  fireEvent.click(screen.getByRole("button", { name: "Withdrawal" }));
  expect(screen.queryByText(/Ombi limehifadhiwa|Requested\./)).not.toBeInTheDocument();
  expect(await screen.findByText("Pending", { selector: "article p" })).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toHaveTextContent("Pending");
  mocks.history = mocks.history.map((item) => ({ ...item, status: "paid" }));
  fireEvent(window, new Event("focus"));
  expect(await screen.findByText("Paid", { selector: "article p" })).toHaveClass("text-success");
  await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("Paid"));
});
