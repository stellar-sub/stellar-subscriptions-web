import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MerchantPlansTable } from "./MerchantPlansTable";
import type { Plan } from "@/types";

vi.mock("@/components/ui/TokenAmount", () => ({
  TokenAmount: ({ value }: { value: bigint }) => <span>{value.toString()}</span>,
}));

const plan = (id: number, name: string, active: boolean): Plan => ({
  id,
  merchant: "GMERCHANT",
  name,
  token: "CTOKEN",
  amountPerPeriod: 1000n,
  intervalLedgers: 17280,
  defaultCap: 5000n,
  active,
  createdAt: 1,
});

describe("MerchantPlansTable", () => {
  it("shows Active / Inactive badges and dims inactive rows", () => {
    render(<MerchantPlansTable plans={[plan(1, "Live", true), plan(2, "Retired", false)]} />);

    const rows = screen.getAllByRole("row");
    const live = rows.find((r) => r.textContent?.includes("Live"))!;
    const retired = rows.find((r) => r.textContent?.includes("Retired"))!;

    expect(live).toHaveTextContent("Active");
    expect(live).not.toHaveClass("opacity-50");
    expect(retired).toHaveTextContent("Inactive");
    expect(retired).toHaveClass("opacity-50");
  });

  it("renders the empty state", () => {
    render(<MerchantPlansTable plans={[]} />);
    expect(screen.getByText(/not published any plans/i)).toBeInTheDocument();
  });
});
