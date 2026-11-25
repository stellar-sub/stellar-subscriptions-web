import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubStatus, type Subscription } from "@/types";

// Per-test subscription, swapped via a hoisted holder so the useSubscription
// mock can return it without referencing a non-hoisted variable.
const subHolder = vi.hoisted(() => ({ current: undefined as Subscription | undefined }));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "7" }),
}));

vi.mock("@/hooks/useSubscriptions", () => ({
  useSubscription: () => ({
    data: subHolder.current ?? null,
    error: null,
    isLoading: false,
    reload: vi.fn(),
  }),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({ network: "testnet", address: null }),
}));

const ledger = vi.hoisted(() => ({ sequence: 5_000_000, observedAt: 0, stale: false }));
vi.mock("@/hooks/useLedger", () => ({
  useLedger: () => ({
    sequence: ledger.sequence,
    observedAt: ledger.observedAt,
    stale: ledger.stale,
    degraded: false,
    consecutiveFailures: 0,
  }),
}));

vi.mock("@/hooks/useTx", () => ({
  useTx: () => ({ phase: "idle", hash: null, error: null, pending: false, run: vi.fn(), reset: vi.fn() }),
}));

vi.mock("@/hooks/useToken", () => ({
  useToken: () => ({
    data: { contractId: "CUSDC", symbol: "USDC", name: "USD Coin", decimals: 7 },
    error: null,
    isLoading: false,
  }),
}));

// Charge history reaches the network; stub it so the snapshot stays about the
// page's own exhausted-state markup.
vi.mock("@/components/subscription/ChargeHistory", () => ({
  ChargeHistory: () => <div data-testid="charge-history">Charge history</div>,
}));

// Spinner imports a module that doesn't exist in this checkout; stub it so the
// page's static import never loads the broken module.
vi.mock("@/components/ui/Spinner", () => ({
  LoadingBlock: ({ label }: { label: string }) => <div>{label}</div>,
}));

const EXHAUSTED: Subscription = {
  id: 7,
  subscriber: "GBKAVFZ5GCZMMIV3ZKZL5USKFYT5DBBZTY4P5V5J75ANHWTX7GASETK4",
  merchant: "GCLAL5UFF47MT7JMJHSS4BWXMMKJSTGYE62HJ5X77N45UKLF7BIDKKTU",
  token: "CUSDC",
  amountPerPeriod: 1_000_000n,
  intervalLedgers: 720,
  totalCap: 12_000_000n,
  totalCharged: 12_000_000n,
  startLedger: 100,
  lastChargeLedger: 9_000,
  nextChargeLedger: 9_720,
  status: SubStatus.Exhausted,
  planId: 1,
};

const ACTIVE: Subscription = { ...EXHAUSTED, totalCharged: 0n, status: SubStatus.Active };

import SubscriptionDetailPage from "./page";

describe("Subscription detail page", () => {
  beforeEach(() => {
    subHolder.current = EXHAUSTED;
    ledger.sequence = 5_000_000;
    ledger.observedAt = new Date("2025-01-01T00:00:00Z").getTime();
    ledger.stale = false;
  });

  it("matches the snapshot for the exhausted state", () => {
    subHolder.current = EXHAUSTED;
    const { asFragment } = render(<SubscriptionDetailPage />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("warns that an exhausted subscription can't be resumed and a new one is needed", () => {
    subHolder.current = EXHAUSTED;
    render(<SubscriptionDetailPage />);

    const note = screen.getByTestId("exhausted-notice");
    expect(note).toHaveTextContent(/fully charged/);
    expect(note).toHaveTextContent(/can.t be resumed or charged again/);
    expect(note).toHaveTextContent(/new subscription/);

    const link = screen.getByRole("link", { name: /subscribe to a plan/i });
    expect(link).toHaveAttribute("href", "/plans");
  });

  it("does not show the exhausted note for an active subscription", () => {
    subHolder.current = ACTIVE;
    render(<SubscriptionDetailPage />);
    expect(screen.queryByTestId("exhausted-notice")).toBeNull();
  });
});
