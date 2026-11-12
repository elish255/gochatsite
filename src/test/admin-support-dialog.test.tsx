import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminSupportDialog } from "@/components/gochati/AdminSupportDialog";

afterEach(cleanup);

describe("AdminSupportDialog", () => {
  it("shows the selected user's dashboard as a read-only support view", () => {
    render(
      <AdminSupportDialog
        open
        onOpenChange={vi.fn()}
        user={{ username: "sample-user", full_name: "Sample User" }}
        loading={false}
        error=""
        data={{
          profile: {
            username: "sample-user",
            full_name: "Sample User",
            country: "Tanzania",
            account_status: "active",
            activation_paid: true,
            vip_tax_paid: true,
            is_premium: true,
            is_vip: true,
            balance: 450000,
            created_at: "2026-11-12T12:00:00.000Z",
          },
          withdrawals: [
            {
              id: "withdrawal-1",
              amount: 100000,
              net_amount: 80000,
              status: "pending",
              created_at: "2026-11-12T12:00:00.000Z",
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Support view — kusoma tu")).toBeInTheDocument();
    expect(screen.getByText("TZS 450,000")).toBeInTheDocument();
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("Withdrawal za karibuni")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit|approve|washa/i })).not.toBeInTheDocument();
  });
});
