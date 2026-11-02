import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), api: vi.fn() }));
vi.mock("@/integrations/netlify/client", () => ({
  platform: { auth: { getUser: mocks.getUser } },
}));
vi.mock("@/components/gochati/customer-care-api", () => ({ careApi: mocks.api }));
vi.mock("@/components/gochati/CustomerCareChat", () => ({
  CustomerCareChat: () => <div>Customer care conversation</div>,
}));
import { SupportButton } from "@/components/gochati/SupportButton";
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: null } });
});
it("directs visitors to the existing customer service number", async () => {
  render(<SupportButton floating />);
  fireEvent.click(screen.getByRole("button", { name: "Customer services" }));
  expect(await screen.findByRole("link", { name: "Tuma SMS" })).toHaveAttribute(
    "href",
    "sms:0743871339?body=Nielekeze%20kuhusu%20Gochat",
  );
  expect(mocks.api).not.toHaveBeenCalled();
});
it("directs inactive accounts to SMS", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  mocks.api.mockResolvedValue({ active: false });
  render(<SupportButton />);
  fireEvent.click(screen.getByRole("button", { name: "Customer services" }));
  expect(await screen.findByRole("link", { name: "Tuma SMS" })).toBeInTheDocument();
  expect(screen.queryByText("Customer care conversation")).not.toBeInTheDocument();
});
it("opens an in-account conversation for active accounts", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  mocks.api.mockResolvedValue({ active: true });
  render(<SupportButton />);
  fireEvent.click(screen.getByRole("button", { name: "Customer services" }));
  expect(await screen.findByText("Customer care conversation")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Tuma SMS" })).not.toBeInTheDocument();
});
it("keeps the SMS fallback available when session checks fail", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  mocks.api.mockRejectedValue(new Error("Session imeisha."));
  render(<SupportButton />);
  fireEvent.click(screen.getByRole("button", { name: "Customer services" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Session imeisha.");
  expect(screen.getByRole("link", { name: "Tuma SMS" })).toBeInTheDocument();
});
it("shows an unread badge and a top notification that opens customer service", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } } });
  mocks.api.mockResolvedValue({ active: true, unread: 2 });
  render(<SupportButton floating />);
  expect(await screen.findByLabelText("2 ujumbe mpya")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Customer services: ujumbe mpya (2)");
  fireEvent.click(screen.getByRole("button", { name: "Soma ujumbe" }));
  expect(await screen.findByText("Customer care conversation")).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
