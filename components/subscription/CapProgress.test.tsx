import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CapProgress } from "./CapProgress";
import { SubStatus, type Subscription } from "@/types";

// TokenAmount calls useToken internally; stub it so tests don't need an RPC
// server and always get a stable formatted string.
vi.mock("@/hooks/useToken", () => ({
  useToken: () => ({ data: { symbol: "XLM", decimals: 7 }, error: null }),
}));

/**
 * Build a minimal Subscription. The interesting fields for CapProgress are
 * totalCap, totalCharged, amountPerPeriod and status.
 */
function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 1,
    subscriber: "GSUB",
    merchant: "GMERCHANT",
    token: "CXLM",
    // 10 periods × 1 XLM/period = 10 XLM cap with no remainder
    amountPerPeriod: 10_000_000n, // 1 XLM (7 decimals)
    intervalLedgers: 17_280,
    totalCap: 100_000_000n, // 10 XLM
    totalCharged: 0n,
    startLedger: 1,
    lastChargeLedger: 0,
    nextChargeLedger: 1_000,
    status: SubStatus.Active,
    planId: 0,
    ...overrides,
  };
}

describe("CapProgress – unchargeable segment", () => {
  it("does NOT render an unchargeable segment when the cap divides evenly", () => {
    // cap 100_000_000 % amountPerPeriod 10_000_000 = 0 → no remainder
    render(<CapProgress sub={makeSub()} />);
    expect(screen.queryByTestId("unchargeable-segment")).not.toBeInTheDocument();
  });

  it("renders an unchargeable segment when a remainder exists", () => {
    // cap 105_000_000 % amountPerPeriod 10_000_000 = 5_000_000 → remainder
    render(<CapProgress sub={makeSub({ totalCap: 105_000_000n })} />);
    expect(screen.getByTestId("unchargeable-segment")).toBeInTheDocument();
  });

  it("sizes the unchargeable segment proportionally to the remainder", () => {
    // remainder = 5_000_000 / 105_000_000 ≈ 4.76 %
    render(<CapProgress sub={makeSub({ totalCap: 105_000_000n })} />);
    const seg = screen.getByTestId("unchargeable-segment");
    const widthStr = (seg as HTMLElement).style.width;
    const width = parseFloat(widthStr);
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThan(10);
  });

  it("has a tooltip explaining why the slice cannot be charged", () => {
    render(<CapProgress sub={makeSub({ totalCap: 105_000_000n })} />);
    const seg = screen.getByTestId("unchargeable-segment");
    expect(seg).toHaveAttribute("title");
    expect(seg.getAttribute("title")!.toLowerCase()).toMatch(/cannot|never/);
  });

  it("renders an unchargeable segment even when the subscription is active with zero charged", () => {
    render(<CapProgress sub={makeSub({ totalCap: 105_000_000n, totalCharged: 0n })} />);
    expect(screen.getByTestId("unchargeable-segment")).toBeInTheDocument();
  });

  it("renders an unchargeable segment when partially charged and a remainder exists", () => {
    // 2 charges done, remainder still 5_000_000
    render(
      <CapProgress
        sub={makeSub({ totalCap: 105_000_000n, totalCharged: 20_000_000n })}
      />,
    );
    expect(screen.getByTestId("unchargeable-segment")).toBeInTheDocument();
  });

  it("still shows the unchargeable segment for a cancelled subscription", () => {
    render(
      <CapProgress
        sub={makeSub({
          totalCap: 105_000_000n,
          status: SubStatus.Cancelled,
        })}
      />,
    );
    expect(screen.getByTestId("unchargeable-segment")).toBeInTheDocument();
  });

  it("shows the footer note about the unchargeable slice when a remainder exists", () => {
    render(<CapProgress sub={makeSub({ totalCap: 105_000_000n })} />);
    expect(
      screen.getByText(/smaller than one period.s charge/i),
    ).toBeInTheDocument();
  });

  it("does NOT show the unchargeable footer note when the cap divides evenly", () => {
    render(<CapProgress sub={makeSub()} />);
    expect(
      screen.queryByText(/smaller than one period.s charge/i),
    ).not.toBeInTheDocument();
  });
});
