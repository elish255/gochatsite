import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HomeVisitorCard } from "@/components/gochati/HomeVisitorCard";

afterEach(cleanup);

describe("HomeVisitorCard feature controls", () => {
  it("disables chat and call actions when the account features are disabled", () => {
    render(
      <HomeVisitorCard
        person={{
          id: 1,
          name: "Asha",
          age: 27,
          country: "Tanzania",
          flag: "TZ",
          photo: "/avatar.jpg",
          fallbackPhoto: "/fallback.jpg",
          online: true,
          topic: "Language",
          rate: { amount: 1000 },
        }}
        onChat={vi.fn()}
        onCall={vi.fn()}
        chatEnabled={false}
        callsEnabled={false}
      />,
    );

    expect(screen.getByRole("button", { name: /Chat imezimwa/ })).toBeDisabled();
    const callButtons = screen.getAllByRole("button", { name: /Sauti\/video zimezimwa kwa Asha/ });
    expect(callButtons).toHaveLength(2);
    callButtons.forEach((button) => expect(button).toBeDisabled());
  });
});
