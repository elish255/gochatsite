import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AdminOverview } from "@/components/gochati/AdminOverview";
afterEach(cleanup);
it("summarizes successful payments and switches the daily chart to registrations", () => {
  const date = new Date().toISOString();
  const onUsers = vi.fn();
  render(
    <AdminOverview
      users={[
        { created_at: date, activation_paid: true, account_status: "active" },
        { created_at: date },
      ]}
      payments={[
        { created_at: date, status: "success", amount: 16000 },
        { created_at: date, status: "failed", amount: 32000 },
      ]}
      onUsers={onUsers}
    />,
  );
  const chart = screen.getByRole("region", { name: "Takwimu za siku 14" });
  expect(within(chart).getByText("TZS 16,000")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Usajili" }));
  expect(within(chart).getByText("2", { selector: "strong" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Usajili" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: /Inactive/ }));
  expect(onUsers).toHaveBeenCalledWith("inactive");
});
it("shows an empty chart using zero totals when there are no records", () => {
  render(<AdminOverview users={[]} payments={[]} onUsers={vi.fn()} />);
  expect(screen.getByText("Hakuna malipo yaliyofanikiwa katika siku hizi.")).toBeInTheDocument();
  expect(screen.getAllByText("TZS 0")).toHaveLength(2);
});
