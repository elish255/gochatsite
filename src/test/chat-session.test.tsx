import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ActivationRequiredDialog } from "@/components/gochati/ActivationRequiredDialog";
import { ChatSession, CallDialog } from "@/components/gochati/Gochati.jsx";

const sessionId = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), getSession: vi.fn() }));
vi.mock("@/integrations/supabase/platform", () => ({
  platform: {
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
  },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
  },
}));
const person = { id: 1, name: "Mia", photo: "/avatar.jpg", flag: "GB" };
beforeEach(() => {
  vi.useFakeTimers();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-one" } }, error: null });
  mocks.getSession.mockResolvedValue({
    data: { session: { access_token: "test-token" } },
    error: null,
  });
  mocks.rpc.mockResolvedValue({ data: sessionId });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() => Response.json({ reply: "Habari! Una swali gani kuhusu muziki?" })),
  );
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it("answers questions through the chat endpoint with conversation context", async () => {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockResolvedValueOnce(Response.json({ reply: "Ninapenda jazz, hasa saxophone." }));
  render(<ChatSession person={person} active onClose={vi.fn()} onPaid={vi.fn()} />);
  await act(async () => {
    fireEvent.click(screen.getByText("Dakika 5"));
  });
  fireEvent.change(screen.getByPlaceholderText("Andika ujumbe wako..."), {
    target: { value: "Unapenda muziki gani?" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Tuma" }));
  });
  expect(screen.getByText("Ninapenda jazz, hasa saxophone.")).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText("Andika ujumbe wako..."), {
    target: { value: "Kwa nini?" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Tuma" }));
  });
  const payload = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
  expect(payload.personId).toBe(1);
  expect(payload.sessionId).toBe(sessionId);
  expect(payload.messages).toEqual(
    expect.arrayContaining([
      { role: "assistant", content: "Ninapenda jazz, hasa saxophone." },
      { role: "user", content: "Kwa nini?" },
    ]),
  );
});

it("starts inactive chats immediately and prompts after the third message without a countdown", async () => {
  const fetchMock = vi.mocked(fetch);
  render(<ChatSession person={person} active={false} onClose={vi.fn()} onPaid={vi.fn()} />);

  const input = screen.getByPlaceholderText("Andika ujumbe wako...");
  expect(input).toBeEnabled();
  expect(screen.queryByText("Chagua muda na kiasi cha malipo")).not.toBeInTheDocument();
  expect(screen.queryByText("00:01")).not.toBeInTheDocument();

  for (const message of ["Meseji ya kwanza", "Meseji ya pili"]) {
    fireEvent.change(input, { target: { value: message } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Tuma" }));
    });
  }

  fireEvent.change(input, { target: { value: "Meseji ya tatu" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Tuma" }));
  });

  expect(screen.getByRole("heading", { name: /Endelea Kuchat na Kulipwa/ })).toBeInTheDocument();
  expect(screen.getByText(/Umefikia mwisho wa mazungumzo ya bure/)).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("restores a failed message for retry without adding a fabricated reply", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    Response.json({ message: "Chat haipatikani." }, { status: 503 }),
  );
  render(<ChatSession person={person} active onClose={vi.fn()} onPaid={vi.fn()} />);
  await act(async () => {
    fireEvent.click(screen.getByText("Dakika 5"));
  });
  fireEvent.change(screen.getByPlaceholderText("Andika ujumbe wako..."), {
    target: { value: "Unaishi wapi?" },
  });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Tuma" }));
  });
  expect(screen.getByRole("alert")).toHaveTextContent("Chat haipatikani.");
  expect(screen.getByPlaceholderText("Andika ujumbe wako...")).toHaveValue("Unaishi wapi?");
  expect(screen.getByRole("button", { name: "Tuma" })).toBeEnabled();
});

it("starts an active chat, accepts messages, and completes once after the countdown", async () => {
  const onPaid = vi.fn();
  render(<ChatSession person={person} active onClose={vi.fn()} onPaid={onPaid} />);
  await act(async () => {
    fireEvent.click(screen.getByText("Dakika 1"));
  });
  expect(mocks.rpc).toHaveBeenCalledWith("gochati_start_earning_session", {
    p_amount: 5000,
    p_minutes: 1,
    p_partner: "person-1",
  });
  const input = screen.getByPlaceholderText("Andika ujumbe wako...");
  expect(input).toBeEnabled();
  fireEvent.change(input, { target: { value: "Habari yako" } });
  fireEvent.click(screen.getByRole("button", { name: "Tuma" }));
  expect(screen.getByText("Habari yako")).toBeInTheDocument();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
  expect(screen.getByText("00:59")).toBeInTheDocument();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(59000);
  });
  expect(onPaid).toHaveBeenCalledExactlyOnceWith(5000, sessionId);
  expect(input).toBeDisabled();
});

it.each(["voice", "video"])("ends an active %s call after three seconds", async (kind) => {
  render(<CallDialog person={person} kind={kind} active onClose={vi.fn()} />);
  expect(screen.getByText("Inaita... 00:03")).toBeInTheDocument();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect(screen.getByText("Imeshindwa Kuanzisha, Endelea Kuchat")).toBeInTheDocument();
  expect(screen.queryByText("Fungua Account Hapa")).not.toBeInTheDocument();
});

it("shows the activation fee and payment action", () => {
  render(<ActivationRequiredDialog open onClose={vi.fn()} />);
  expect(screen.getByRole("heading", { name: /Endelea Kuchat na Kulipwa/ })).toBeInTheDocument();
  expect(screen.getByText(/Umefikia mwisho wa mazungumzo ya bure/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /LIPIA SASA/i })).toHaveAttribute(
    "href",
    "/payment?type=activation",
  );
});

it("offers a valid session when an open free chat gains activation access", async () => {
  const onClose = vi.fn();
  const onPaid = vi.fn();
  const view = render(
    <ChatSession person={person} active={false} onClose={onClose} onPaid={onPaid} />,
  );
  view.rerender(<ChatSession person={person} active onClose={onClose} onPaid={onPaid} />);
  expect(mocks.rpc).not.toHaveBeenCalled();
  await act(async () => {
    fireEvent.click(screen.getByText("Dakika 5"));
  });
  expect(mocks.rpc).toHaveBeenCalledWith("gochati_start_earning_session", {
    p_amount: 25000,
    p_minutes: 5,
    p_partner: "person-1",
  });
});
