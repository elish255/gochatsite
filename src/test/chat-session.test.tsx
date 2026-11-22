import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ActivationRequiredDialog } from "@/components/gochati/ActivationRequiredDialog";
import { ChatSession, CallDialog } from "@/components/gochati/Gochati.jsx";
import { chatExchangePrice } from "@/lib/chat-exchange-prices";

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

it("assigns each guest the matching completed-exchange rate", () => {
  expect(Array.from({ length: 12 }, (_, index) => chatExchangePrice(index + 1))).toEqual([
    48500, 42500, 42000, 44500, 53000, 45500, 45000, 41000, 48500, 50500, 49500, 52000,
  ]);
  expect(chatExchangePrice(13)).toBe(48500);
});

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
    vi
      .fn()
      .mockImplementation(() =>
        Response.json({
          reply: "Habari! Una swali gani kuhusu muziki?",
          balance: 10000,
          messageCount: 1,
          rewarded: false,
        }),
      ),
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
    await Promise.resolve();
  });
  expect(screen.getByPlaceholderText("Andika ujumbe wako...")).toBeEnabled();
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
    await Promise.resolve();
  });
  expect(screen.getByPlaceholderText("Andika ujumbe wako...")).toBeEnabled();
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

it("credits each complete exchange without starting a countdown", async () => {
  const onPaid = vi.fn();
  render(<ChatSession person={person} active onClose={vi.fn()} onPaid={onPaid} />);
  const input = screen.getByPlaceholderText("Andika ujumbe wako...");
  await act(async () => {
    await Promise.resolve();
  });
  expect(input).toBeEnabled();
  expect(mocks.rpc).toHaveBeenCalledWith("gochati_start_exchange_session", {
    p_partner: "person-1",
  });
  expect(screen.queryByText(/baada ya meseji \d+/i)).not.toBeInTheDocument();
  expect(screen.queryByText("00:59")).not.toBeInTheDocument();
  for (let messageNumber = 1; messageNumber <= 10; messageNumber += 1) {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({
        reply: `Jibu la ${messageNumber}`,
        balance: messageNumber === 10 ? 10000 : 0,
        messageCount: messageNumber,
        rewarded: messageNumber === 10,
      }),
    );
    fireEvent.change(input, { target: { value: `Ujumbe wa ${messageNumber}` } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Tuma" }));
    });
    expect(onPaid).toHaveBeenCalledTimes(messageNumber === 10 ? 1 : 0);
  }

  expect(screen.getByText("Malipo ya TZS 48,500 yameongezwa kwenye salio lako. Fungua chat mpya kuendelea.")).toBeInTheDocument();
  expect(screen.queryByText(/meseji \d+|baada ya kukamilisha/i)).not.toBeInTheDocument();
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
  await act(async () => {
    await Promise.resolve();
  });
  expect(mocks.rpc).toHaveBeenCalledWith("gochati_start_exchange_session", {
    p_partner: "person-1",
  });
});
