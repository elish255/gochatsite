import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WithdrawalUpgradeReminder } from "@/components/gochati/WithdrawalUpgradeReminder";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("WithdrawalUpgradeReminder", () => {
  it("shows for eligible accounts and returns two minutes after dismissal", () => {
    vi.useFakeTimers();
    render(<WithdrawalUpgradeReminder eligible />);

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Umefikia Kiwango Cha kutoa Pesa, Gusa Toa Pesa Weka kiasi Kisha Kamilisha Malipo ya Upgrade ili kupokea Withdrawal Yako",
    );
    expect(screen.getByRole("link", { name: "Upgrade" })).toHaveAttribute("href", "/withdrawal");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not render for accounts that are not eligible", () => {
    render(<WithdrawalUpgradeReminder eligible={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
