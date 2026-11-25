import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextChargeCountdown } from "./NextChargeCountdown";
import { estimateLedgerDate } from "@/lib/contracts";
import { formatDateTime } from "@/lib/format";
import { SubStatus, type Subscription } from "@/types";

// A controllable ledger so each test can place the current ledger where it
// wants, without a real RPC call.
const ledger = vi.hoisted(() => ({ sequence: 1000, observedAt: 0, stale: false }));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({ network: "testnet" }),
}));

vi.mock("@/hooks/useLedger", () => ({
  useLedger: () => ({
    sequence: ledger.sequence,
    observedAt: ledger.observedAt,
    stale: ledger.stale,
    degraded: false,
    consecutiveFailures: 0,
  }),
}));

const FIXED_MS = new Date("2025-01-01T00:00:00Z").getTime();

const base: Subscription = {
  id: 7,
  subscriber: "S",
  merchant: "M",
  token: "CXLM",
  amountPerPeriod: 1_000_000n,
  intervalLedgers: 720,
  totalCap: 12_000_000n,
  totalCharged: 0n,
  startLedger: 100,
  lastChargeLedger: 900,
  nextChargeLedger: 1_620,
  status: SubStatus.Active,
  planId: 1,
};

describe("NextChargeCountdown", () => {
  beforeEach(() => {
    ledger.sequence = 1000;
    ledger.observedAt = FIXED_MS;
    ledger.stale = false;
  });

  it("shows the estimated next-charge date, labeled approx., in a <time> with a datetime attribute", () => {
    const { container } = render(
      <NextChargeCountdown sub={base} latestLedger={1000} latestClosedAt={new Date(FIXED_MS)} />,
    );

    const time = container.querySelector("time");
    expect(time).not.toBeNull();

    const expected = estimateLedgerDate(base.nextChargeLedger, 1000, new Date(FIXED_MS));
    // The machine-readable value is an ISO timestamp, independent of locale.
    expect(time).toHaveAttribute("datetime", expected.toISOString());
    // The visible label is prefixed "approx." and formatted with the same
    // formatter the component uses, so it matches regardless of time zone.
    expect(time).toHaveTextContent(`approx. ${formatDateTime(expected)}`);
  });

  it("still shows the estimate when no props are passed, falling back to the live ledger", () => {
    const { container } = render(<NextChargeCountdown sub={base} />);

    const time = container.querySelector("time");
    expect(time).not.toBeNull();

    const expected = estimateLedgerDate(base.nextChargeLedger, ledger.sequence, new Date(ledger.observedAt));
    expect(time).toHaveAttribute("datetime", expected.toISOString());
    expect(time).toHaveTextContent(`approx. ${formatDateTime(expected)}`);
  });

  it("shows the rough duration alongside the estimated date", () => {
    render(
      <NextChargeCountdown sub={base} latestLedger={1000} latestClosedAt={new Date(FIXED_MS)} />,
    );
    // 1_620 - 1_000 = 620 ledgers ≈ 51 minutes 40 seconds → "about 51 minutes".
    expect(screen.getByText(/Not before about/)).toBeInTheDocument();
  });

  it("says none once the cap is fully charged and shows no date", () => {
    const { container } = render(<NextChargeCountdown sub={{ ...base, status: SubStatus.Exhausted }} />);
    expect(screen.getByText("None — cap fully charged")).toBeInTheDocument();
    expect(container.querySelector("time")).toBeNull();
  });

  it("says none while paused and shows no date", () => {
    const { container } = render(<NextChargeCountdown sub={{ ...base, status: SubStatus.Paused }} />);
    expect(screen.getByText("None while paused")).toBeInTheDocument();
    expect(container.querySelector("time")).toBeNull();
  });

  it("says none once cancelled and shows no date", () => {
    const { container } = render(<NextChargeCountdown sub={{ ...base, status: SubStatus.Cancelled }} />);
    expect(screen.getByText("None — cancelled")).toBeInTheDocument();
    expect(container.querySelector("time")).toBeNull();
  });

  it("reads as allowed now and shows no estimated date when the next charge ledger has passed", () => {
    const { container } = render(<NextChargeCountdown sub={{ ...base, nextChargeLedger: 900 }} />);
    expect(screen.getByText("Allowed now")).toBeInTheDocument();
    expect(container.querySelector("time")).toBeNull();
  });
});
