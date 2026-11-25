import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChargedToday } from "./ChargedToday";
import type { ChargeEvent } from "@/types";

const NOW = new Date("2026-11-19T12:00:00.000Z");

function chargeEvent(overrides: Partial<ChargeEvent> = {}): ChargeEvent {
  return {
    subscriptionId: 1,
    merchant: "GMERCHANT",
    amount: 10_000_000n,
    totalCharged: 10_000_000n,
    exhausted: false,
    ledger: 1,
    closedAt: NOW,
    txHash: "abc",
    ...overrides,
  };
}

describe("ChargedToday", () => {
  it("counts only the charges that closed today", () => {
    render(
      <ChargedToday
        now={NOW}
        events={[
          chargeEvent(),
          chargeEvent({ subscriptionId: 2, closedAt: new Date("2026-11-19T01:00:00.000Z") }),
          chargeEvent({ subscriptionId: 3, closedAt: new Date("2026-11-18T23:59:59.000Z") }),
        ]}
      />,
    );

    expect(screen.getByText("2 charges today")).toBeInTheDocument();
  });

  it("uses the singular for a single charge", () => {
    render(<ChargedToday now={NOW} events={[chargeEvent()]} />);

    expect(screen.getByText("1 charge today")).toBeInTheDocument();
  });

  it("totals the day's charges per token", () => {
    const tokenBySubscription = new Map([
      [1, "CXLM"],
      [2, "CXLM"],
      [3, "CUSDC"],
    ]);

    render(
      <ChargedToday
        now={NOW}
        events={[
          chargeEvent({ subscriptionId: 1, amount: 10_000_000n }),
          chargeEvent({ subscriptionId: 2, amount: 5_000_000n }),
          chargeEvent({ subscriptionId: 3, amount: 3_000_000n }),
        ]}
        tokenBySubscription={tokenBySubscription}
        tokens={{
          CXLM: { symbol: "XLM", decimals: 7 },
          CUSDC: { symbol: "USDC", decimals: 7 },
        }}
      />,
    );

    expect(screen.getByText("3 charges today")).toBeInTheDocument();
    expect(screen.getByText("1.5 XLM")).toBeInTheDocument();
    expect(screen.getByText("0.3 USDC")).toBeInTheDocument();
  });

  it("shows an empty report when nothing was charged today", () => {
    render(<ChargedToday now={NOW} events={[chargeEvent({ closedAt: new Date("2026-11-18T12:00:00.000Z") })]} />);

    expect(screen.getByText("0 charges today")).toBeInTheDocument();
  });

  it("shows a loading state instead of a zero count", () => {
    render(<ChargedToday events={[]} loading />);

    expect(screen.getByText("Loading charges…")).toBeInTheDocument();
    expect(screen.queryByText(/charges today/)).not.toBeInTheDocument();
  });
});
