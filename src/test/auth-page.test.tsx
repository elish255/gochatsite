import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPage } from "@/components/gochati/AuthPage";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  signup: vi.fn(),
  navigate: vi.fn(),
  recover: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/integrations/netlify/client", () => ({
  platform: { auth: { signInWithUsername: mocks.login, signUp: mocks.signup } },
}));
vi.mock("@netlify/identity", () => ({ requestPasswordRecovery: mocks.recover }));
beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(cleanup);

describe("Account screens", () => {
  it("logs in with a username rather than an email", async () => {
    mocks.login.mockResolvedValue({ error: null });
    render(<AuthPage mode="login" />);
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "Amina" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "example-password" } });
    fireEvent.click(screen.getByRole("button", { name: "INGIA" }));
    await waitFor(() =>
      expect(mocks.login).toHaveBeenCalledWith({ username: "amina", password: "example-password" }),
    );
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/payment", replace: true });
  });
  it("takes a newly saved account straight to payment", async () => {
    mocks.signup.mockResolvedValue({
      data: { session: { user: { id: "new-user" } } },
      error: null,
    });
    render(<AuthPage mode="register" />);
    for (const [label, value] of Object.entries({
      "Full name": "Amina Said",
      Email: "amina@example.test",
      Username: "amina",
      "Phone number": "0712345678",
      "Choose Country": "Tanzania",
      Password: "example-password",
      "Repeat password": "example-password",
    })) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "JISAJILI" }));
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/payment", replace: true }),
    );
    expect(mocks.signup).toHaveBeenCalledWith(expect.objectContaining({ agreeTerms: true }));
  });
  it("opens email recovery from the login screen", async () => {
    mocks.recover.mockResolvedValue(undefined);
    render(<AuthPage mode="login" />);
    fireEvent.click(screen.getByRole("button", { name: /Forgot password/ }));
    fireEvent.change(screen.getByLabelText("Email ya kurejesha password"), {
      target: { value: "amina@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tuma kiungo cha password mpya" }));
    await waitFor(() => expect(mocks.recover).toHaveBeenCalledWith("amina@example.test"));
    expect(await screen.findByRole("status")).toHaveTextContent("kiungo cha kurejesha password");
  });
});
