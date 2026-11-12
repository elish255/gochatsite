import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { UserGreeting } from "@/components/gochati/UserGreeting";

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const onAuthStateChange = vi.fn();

  return {
    getUser: vi.fn(),
    onAuthStateChange,
    from,
    select,
    eq,
    maybeSingle,
  };
});

vi.mock("@/integrations/supabase/platform", () => ({
  platform: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { onAuthStateChange: mocks.onAuthStateChange } },
}));

function renderGreeting() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <UserGreeting />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({
    data: {
      user: {
        id: "user-one",
        email: "amina@example.com",
        user_metadata: {},
      },
    },
    error: null,
  });
  mocks.maybeSingle.mockResolvedValue({ data: { username: "amina" }, error: null });
  mocks.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
});

afterEach(cleanup);

it("welcomes a signed-in user by their profile username", async () => {
  renderGreeting();

  expect(await screen.findByRole("heading", { name: "Welcome, @amina" })).toBeInTheDocument();
  expect(mocks.from).toHaveBeenCalledWith("gochati_users");
  expect(mocks.select).toHaveBeenCalledWith("username");
});

it("refreshes the greeting when another user signs in", async () => {
  mocks.getUser
    .mockResolvedValueOnce({
      data: { user: { id: "user-one", email: "amina@example.com", user_metadata: {} } },
      error: null,
    })
    .mockResolvedValueOnce({
      data: { user: { id: "user-two", email: "juma@example.com", user_metadata: {} } },
      error: null,
    });
  mocks.maybeSingle
    .mockResolvedValueOnce({ data: { username: "amina" }, error: null })
    .mockResolvedValueOnce({ data: { username: "juma" }, error: null });

  renderGreeting();
  expect(await screen.findByRole("heading", { name: "Welcome, @amina" })).toBeInTheDocument();

  const onAuthChange = mocks.onAuthStateChange.mock.calls[0]?.[0] as (event: string) => void;
  await act(async () => onAuthChange("SIGNED_IN"));

  expect(await screen.findByRole("heading", { name: "Welcome, @juma" })).toBeInTheDocument();
});
