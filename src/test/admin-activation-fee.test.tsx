import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminActivationFee } from "@/components/gochati/AdminActivationFee";
const mocks = vi.hoisted(() => ({ single: vi.fn(), update: vi.fn() }));
vi.mock("@/integrations/supabase/platform", () => ({
  platform: {
    from: () => {
      const query = {
        select: () => query,
        single: mocks.single,
        update: (payload: unknown) => {
          mocks.update(payload);
          return query;
        },
      };
      return query;
    },
  },
}));
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
it("confirms disabling and re-enabling and displays saved server state", async () => {
  mocks.single
    .mockResolvedValueOnce({ data: { enabled: true } })
    .mockResolvedValueOnce({ data: { enabled: false } })
    .mockResolvedValueOnce({ data: { enabled: true } });
  render(<AdminActivationFee />);
  fireEvent.click(await screen.findByRole("button", { name: "Ondoa Activation Fee" }));
  expect(mocks.update).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Thibitisha" }));
  fireEvent.click(await screen.findByRole("button", { name: "Rudisha Activation Fee" }));
  fireEvent.click(screen.getByRole("button", { name: "Thibitisha" }));
  await waitFor(() => expect(mocks.update).toHaveBeenLastCalledWith({ enabled: true }));
  expect(mocks.update).toHaveBeenNthCalledWith(1, { enabled: false });
});
it("does not show a successful toggle when saving fails", async () => {
  mocks.single
    .mockResolvedValueOnce({ data: { enabled: true } })
    .mockResolvedValueOnce({ error: { message: "Denied" } });
  render(<AdminActivationFee />);
  fireEvent.click(await screen.findByRole("button", { name: "Ondoa Activation Fee" }));
  fireEvent.click(screen.getByRole("button", { name: "Thibitisha" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Imeshindwa kuhifadhi");
  expect(screen.getByRole("button", { name: "Ondoa Activation Fee" })).toBeEnabled();
});
it("disables the control if settings cannot be loaded", async () => {
  mocks.single.mockResolvedValue({ error: { message: "Missing migration" } });
  render(<AdminActivationFee />);
  expect(await screen.findByRole("status")).toHaveTextContent("Imeshindwa kupakia");
  expect(screen.getByRole("button", { name: "Ondoa Activation Fee" })).toBeDisabled();
});
