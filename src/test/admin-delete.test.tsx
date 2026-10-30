import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@/integrations/netlify/client", () => ({
  platform: {
    auth: { getUser: async () => ({ data: { user: { id: "admin" } } }) },
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));
vi.mock("@/components/gochati/AuthCallbacks", () => ({ PasswordHelp: () => null }));
import { Route } from "@/routes/admin";
const amina = { id: "amina-id", username: "amina", full_name: "Amina", created_at: "2026-10-30" };
beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.from.mockImplementation((table: string) => {
    const result = {
      data:
        table === "gochati_admins"
          ? { user_id: "admin" }
          : table === "gochati_users"
            ? [amina]
            : [],
      error: null,
    };
    const query: any = {
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    };
    for (const method of ["select", "eq", "maybeSingle", "order", "limit"])
      query[method] = () => query;
    return query;
  });
});
afterEach(cleanup);
const Admin = (Route as unknown as { component: () => React.ReactNode }).component;
it("requires selection and confirmation, and cancellation does not delete", async () => {
  render(<Admin />);
  fireEvent.click(await screen.findByRole("button", { name: /Total Referral/ }));
  const select = await screen.findByLabelText("Chagua akaunti ya amina");
  expect(screen.getByRole("button", { name: "Delete account (0)" })).toBeDisabled();
  fireEvent.click(select);
  fireEvent.click(screen.getByRole("button", { name: "Delete account (1)" }));
  expect(screen.getByRole("alertdialog")).toHaveTextContent("@amina");
  fireEvent.click(screen.getByRole("button", { name: "Ghairi" }));
  expect(mocks.rpc).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Delete account (1)" }));
  mocks.rpc.mockResolvedValue({ data: { deleted: [amina.id], failed: [] }, error: null });
  fireEvent.click(screen.getByRole("button", { name: "Ndiyo, futa akaunti" }));
  await waitFor(() =>
    expect(mocks.rpc).toHaveBeenCalledWith("gochati_admin_delete_users", { user_ids: [amina.id] }),
  );
  expect(await screen.findByText("Akaunti zilizofutwa: 1.")).toBeInTheDocument();
});
it("shows deletion errors and keeps selection for retry", async () => {
  render(<Admin />);
  fireEvent.click(await screen.findByRole("button", { name: /Total Referral/ }));
  fireEvent.click(await screen.findByLabelText("Chagua akaunti ya amina"));
  fireEvent.click(screen.getByRole("button", { name: "Delete account (1)" }));
  mocks.rpc.mockResolvedValue({ data: null, error: new Error("Admin pekee.") });
  fireEvent.click(screen.getByRole("button", { name: "Ndiyo, futa akaunti" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Admin pekee.");
  expect(screen.getByLabelText("Chagua akaunti ya amina")).toBeChecked();
});

it("opens the mobile navigation and follows the Delete Account shortcut", async () => {
  render(<Admin />);
  expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Menyu ya admin" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("Admin Control");
  fireEvent.click(screen.getByRole("button", { name: "Delete Account" }));
  expect(await screen.findByLabelText("Chagua akaunti ya amina")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
