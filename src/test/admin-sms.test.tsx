import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminSms } from "@/components/gochati/AdminSms";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const counts = { all: 20, premium: 4, normal: 14, active: 8, inactive: 12, vip: 2 };

describe("Admin SMS", () => {
  it("shows each audience count and updates the selected recipient total", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ counts })));
    render(<AdminSms />);
    expect(await screen.findByRole("option", { name: "Active users tu (8)" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Wapokeaji wa SMS"), { target: { value: "active" } });
    expect(screen.getByText(/Wapokeaji wa kundi hili:/)).toHaveTextContent("8");
    fireEvent.change(screen.getByLabelText("Wapokeaji wa SMS"), { target: { value: "normal" } });
    expect(screen.getByText(/Wapokeaji wa kundi hili:/)).toHaveTextContent("14");
  });

  it("sends the selected audience and template to the protected endpoint and shows partial failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        total: 2,
        queued: 1,
        failed: 1,
        results: [
          { username: "amina", status: "queued" },
          { username: "juma", status: "failed" },
        ],
      }),
    );
    fetchMock.mockResolvedValueOnce(Response.json({ counts }));
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminSms />);
    expect(screen.getByRole("button", { name: "Tuma SMS" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Wapokeaji wa SMS"), { target: { value: "vip" } });
    fireEvent.change(screen.getByLabelText("Ujumbe wa SMS"), {
      target: { value: "Habari [Username]" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tuma SMS" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Zilizokubaliwa kutumwa: 1"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gochati-sms",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ action: "send", audience: "vip", message: "Habari [Username]" }),
      }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("@juma: SMS imeshindikana.");
  });

  it("shows server errors and preserves the message for correction", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json({ counts }))
        .mockResolvedValue(Response.json({ message: "Huruhusiwi kutuma SMS." }, { status: 403 })),
    );
    render(<AdminSms />);
    fireEvent.change(screen.getByLabelText("Ujumbe wa SMS"), { target: { value: "Habari" } });
    fireEvent.click(screen.getByRole("button", { name: "Tuma SMS" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Huruhusiwi kutuma SMS.");
    expect(screen.getByLabelText("Ujumbe wa SMS")).toHaveValue("Habari");
    expect(screen.getByRole("button", { name: "Tuma SMS" })).toBeEnabled();
  });
});
