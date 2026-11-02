import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), api: vi.fn() }));
vi.mock("@/integrations/netlify/client", () => ({ platform: { auth: { getUser: mocks.getUser } } }));
vi.mock("@/components/gochati/customer-care-api", () => ({ careApi: mocks.api }));
import { SupportButton } from "@/components/gochati/SupportButton";
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("clears the user badge after fetching the conversation and counts subsequent replies afresh", async () => {
  let unread = 3;
  mocks.getUser.mockResolvedValue({ data: { user: { id: "customer" } } });
  mocks.api.mockImplementation(async ({ action }) => {
    if (action === "messages") {
      unread = 0;
      return { data: [{ id: "reply", sender: "admin", body: "Karibu", kind: "text", created_at: "2026-11-02", read_at: null }] };
    }
    return { active: true, unread };
  });
  render(<SupportButton />);
  expect(await screen.findByLabelText("3 ujumbe mpya")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Customer services" }));
  expect(await screen.findByText("Karibu")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByLabelText("3 ujumbe mpya")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  unread = 1;
  fireEvent(window, new Event("focus"));
  expect(await screen.findByLabelText("1 ujumbe mpya")).toBeInTheDocument();
});
