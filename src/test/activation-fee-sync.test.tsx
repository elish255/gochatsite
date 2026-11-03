import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useActivationFee } from "@/hooks/use-activation-fee";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("refreshes the displayed fee when an open user page regains focus", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ activation_fee: 16000 }))
    .mockResolvedValueOnce(Response.json({ activation_fee: 22000 }));
  vi.stubGlobal("fetch", fetcher);
  const { result } = renderHook(() => useActivationFee());
  await waitFor(() => expect(result.current.formatted).toBe("16,000"));
  act(() => { window.dispatchEvent(new Event("focus")); });
  await waitFor(() => expect(result.current.formatted).toBe("22,000"));
});
it("removes an outdated amount if refreshing fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json({ activation_fee: 22000 }))
    .mockRejectedValueOnce(new Error("offline")));
  const { result } = renderHook(() => useActivationFee());
  await waitFor(() => expect(result.current.fee).toBe(22000));
  act(() => { window.dispatchEvent(new Event("focus")); });
  await waitFor(() => expect(result.current.fee).toBeNull());
  expect(result.current.error).toBeTruthy();
});
