import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/withdrawal";

const mocks = vi.hoisted(() => ({
  profile: { account_status: "inactive", activation_paid: false, balance: 800000 },
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
    rpc: mocks.rpc,
    from: () => ({ select: () => ({ eq: () => ({
      single: async () => ({ data: mocks.profile }),
      order: async () => ({ data: [] }),
    }) }) }),
  },
}));

afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); });

describe("Withdrawal account access", () => {
  it.each([
    { account_status: "inactive", activation_paid: true },
    { account_status: "active", activation_paid: false },
  ])("opens activation dialog and blocks requests for $account_status / $activation_paid", async (profile) => {
    Object.assign(mocks.profile, profile);
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    expect(await screen.findByRole("dialog")).toHaveTextContent("Akaunti yako haijawa hai");
    expect(screen.getByRole("link", { name: "Fungua na Activate Akaunti Hapa" })).toHaveAttribute("href", "/register");
    fireEvent.click(screen.getByRole("button", { name: "Funga" }));
    fireEvent.click(screen.getByRole("button", { name: "Hifadhi ombi" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("allows an active paid account to request withdrawal without the dialog", async () => {
    Object.assign(mocks.profile, { account_status: "active", activation_paid: true });
    mocks.rpc.mockResolvedValue({ error: null });
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    await screen.findByText("TZS 800,000");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hifadhi ombi" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("gochati_request_withdrawal", expect.any(Object)));
  });
});
