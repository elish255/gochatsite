import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => vi.fn());
vi.mock("@/components/gochati/customer-care-api", () => ({ careApi: api }));
import { AdminCareNotifications } from "@/components/gochati/AdminCustomerCare";
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("alerts admin about unread user messages already present on arrival", async () => {
  api.mockResolvedValue({
    data: [{ id: "12", kind: "support", username: "mteja", user_id: "customer-id", read_at: null }],
  });
  const open = vi.fn();
  render(<AdminCareNotifications onOpen={open} />);
  expect(await screen.findByRole("status")).toHaveTextContent("User (mteja) ametuma ujumbe");
  expect(screen.getByRole("button", { name: "Mpya (1)" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Fungua" }));
  expect(open).toHaveBeenCalledWith("customer-id");
});
it("does not show a popup for already read events", async () => {
  api.mockResolvedValue({
    data: [{ id: "12", kind: "support", username: "mteja", read_at: "2026-11-02" }],
  });
  render(<AdminCareNotifications onOpen={() => {}} />);
  expect(await screen.findByRole("button", { name: "Mpya (0)" })).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("opens the sender's conversation from the notification list", async () => {
  api.mockResolvedValue({ data: [{ id: "13", kind: "support", username: "amina", user_id: "amina-id", read_at: "2026-11-02" }] });
  const open = vi.fn();
  render(<AdminCareNotifications onOpen={open} />);
  fireEvent.click(await screen.findByRole("button", { name: "Mpya (0)" }));
  expect(screen.getByText("User (amina) ametuma ujumbe")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Fungua customer care" }));
  expect(open).toHaveBeenCalledWith("amina-id");
});

it("refreshes the admin count immediately when a conversation is read", async () => {
  api.mockResolvedValue({ data: [{ id: "20", kind: "support", username: "amina", user_id: "amina-id", read_at: null }] });
  render(<AdminCareNotifications onOpen={() => {}} />);
  expect(await screen.findByRole("button", { name: "Mpya (1)" })).toBeInTheDocument();
  api.mockResolvedValue({ data: [{ id: "20", kind: "support", username: "amina", user_id: "amina-id", read_at: "2026-11-02" }] });
  fireEvent(window, new Event("care-messages-read"));
  expect(await screen.findByRole("button", { name: "Mpya (0)" })).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("shows a new user message popup even when a newer read registration heads the list", async () => {
  api.mockResolvedValue({ data: [{ id: "20", kind: "registration", username: "old", read_at: "2026-11-02" }] });
  render(<AdminCareNotifications onOpen={() => {}} />);
  expect(await screen.findByRole("button", { name: "Mpya (0)" })).toBeInTheDocument();
  api.mockResolvedValue({ data: [
    { id: "22", kind: "registration", username: "new", read_at: "2026-11-02" },
    { id: "21", kind: "support", username: "amina", user_id: "amina-id", read_at: null },
  ] });
  fireEvent(window, new Event("focus"));
  expect(await screen.findByRole("status")).toHaveTextContent("User (amina) ametuma ujumbe");
});
