import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SupportButton } from "@/components/gochati/SupportButton";

afterEach(cleanup);

it("offers SMS after confirming registration", () => {
  render(<SupportButton floating />);
  fireEvent.click(screen.getByRole("button", { name: "Customer services" }));
  expect(screen.getByRole("heading", { name: "UMEJISAJILI?" })).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "NDIO", exact: true }));
  expect(screen.getByRole("link", { name: "Tuma SMS" })).toHaveAttribute(
    "href",
    "sms:0743871339?body=Nielekeze%20kuhusu%20Gochat",
  );
});

it("directs unregistered visitors to the registration form and resets on reopening", () => {
  render(<SupportButton />);
  fireEvent.click(screen.getByRole("button", { name: "Customer services" }));
  fireEvent.click(screen.getByRole("button", { name: "HAPANA" }));
  expect(screen.getByRole("link", { name: "Gusa hapa Kujisajili Kwanza" })).toHaveAttribute(
    "href",
    "/register",
  );
  expect(screen.queryByRole("link", { name: "Tuma SMS" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  fireEvent.click(screen.getByRole("button", { name: "Customer services" }));
  expect(screen.getByRole("heading", { name: "UMEJISAJILI?" })).toBeInTheDocument();
});
