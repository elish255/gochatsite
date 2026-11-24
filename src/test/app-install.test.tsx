import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Gochati } from "@/components/gochati/Gochati.jsx";

vi.mock("@/integrations/supabase/platform", () => ({
  platform: {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
  },
}));

function renderHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Gochati />
    </QueryClientProvider>,
  );
}

const register = vi.fn();
beforeEach(() => {
  register.mockResolvedValue({});
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register },
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Reflect.deleteProperty(navigator, "serviceWorker");
});

it("Download Gochati App registers the worker and directly requests webapp installation", async () => {
  renderHome();
  expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: "accepted" }) });
  act(() => {
    window.dispatchEvent(event);
  });
  expect(event.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Download Gochati App" }));
  await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
  expect(await screen.findByText(/Ombi la kusakinisha GoChati limekubaliwa/)).toBeInTheDocument();
  act(() => {
    window.dispatchEvent(new Event("appinstalled"));
  });
  expect(screen.getByText("GoChati tayari imewekwa kwenye kifaa chako.")).toBeInTheDocument();
});

it("shows browser installation instructions when a native prompt is unavailable", () => {
  renderHome();
  fireEvent.click(screen.getByRole("button", { name: "Download Gochati App" }));
  expect(screen.getByText(/Chagua "Install app" au "Add to Home screen"/)).toBeInTheDocument();
});

it("handles a failed installation prompt and keeps manual instructions available", async () => {
  renderHome();
  const event = new Event("beforeinstallprompt");
  Object.assign(event, { prompt: vi.fn().mockRejectedValue(new Error("Unavailable")) });
  act(() => {
    window.dispatchEvent(event);
  });
  fireEvent.click(screen.getByRole("button", { name: "Download Gochati App" }));
  expect(await screen.findByText(/Usakinishaji haujakamilika/)).toBeInTheDocument();
  expect(screen.getByText(/Chagua "Install app" au "Add to Home screen"/)).toBeInTheDocument();
});
