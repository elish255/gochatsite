import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ChatSession, CallDialog } from "@/components/gochati/Gochati.jsx";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/netlify/client", () => ({ platform: {
  auth: { getUser: async () => ({ data: { user: { id: "user-one" } } }) },
  rpc: mocks.rpc,
} }));
const person = { id: 1, name: "Mia", photo: "/avatar.jpg", flag: "GB" };
beforeEach(() => {
  vi.useFakeTimers();
  mocks.rpc.mockResolvedValue({ data: "session-one" });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

it("starts an active chat, accepts messages, and completes once after the countdown", async () => {
  const onPaid = vi.fn();
  render(<ChatSession person={person} active onClose={vi.fn()} onPaid={onPaid} />);
  await act(async () => { fireEvent.click(screen.getByText("Dakika 1")); });
  expect(mocks.rpc).toHaveBeenCalledWith("gochati_start_earning_session", {
    p_amount: 5000, p_minutes: 1, p_partner: "person-1",
  });
  const input = screen.getByPlaceholderText("Andika ujumbe wako...");
  expect(input).toBeEnabled();
  fireEvent.change(input, { target: { value: "Habari yako" } });
  fireEvent.click(screen.getByRole("button", { name: "Tuma" }));
  expect(screen.getByText("Habari yako")).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
  expect(screen.getByText("00:59")).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(59000); });
  expect(onPaid).toHaveBeenCalledExactlyOnceWith(5000, "session-one");
  expect(input).toBeDisabled();
});

it.each(["voice", "video"])("ends an active %s call after three seconds", async (kind) => {
  render(<CallDialog person={person} kind={kind} active onClose={vi.fn()} />);
  expect(screen.getByText("Inaita... 00:03")).toBeInTheDocument();
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  expect(screen.getByText("Imeshindwa Kuanzisha, Endelea Kuchat")).toBeInTheDocument();
  expect(screen.queryByText("Fungua Account Hapa")).not.toBeInTheDocument();
});
