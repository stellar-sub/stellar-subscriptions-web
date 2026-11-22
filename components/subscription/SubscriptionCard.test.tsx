import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubscriptionCard } from "./SubscriptionCard";
import { SubStatus, type Subscription } from "@/types";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({ network: "testnet" }),
}));

vi.mock("@/hooks/usePlans", () => ({
  usePlan: vi.fn(),
}));

// Control the current ledger from tests.
const ledgerState = vi.hoisted(() => ({ sequence: 1000 }));

vi.mock("@/hooks/useLedger", () => ({
  useLedger: () => ({ sequence: ledgerState.sequence, stale: false }),
}));

// NextChargeCountdown calls useLedger and useWallet internally — mock it out
// so we only test SubscriptionCard's own behaviour here.
vi.mock("./NextChargeCountdown", () => ({
  NextChargeCountdown: () => <div data-testid="next-charge-countdown" />,
}));

// CapProgress talks to useToken; mock it out for the same reason.
vi.mock("./CapProgress", () => ({
  CapProgress: () => <div data-testid="cap-progress" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

import { usePlan } from "@/hooks/usePlans";
const mockedUsePlan = vi.mocked(usePlan);

const idlePlan = { data: undefined, loading: false, error: null };

const baseSub: Subscription = {
  id: 7,
  subscriber: "GBKAVFZ5GCZMMIV3ZKZL5USKFYT5DBBZTY4P5V5J75ANHWTX7GASETK4",
  merchant: "GCLAL5UFF47MT7JMJHSS4BWXMMKJSTGYE62HJ5X77N45UKLF7BIDKKTU",
  token: "CXLM",
  amountPerPeriod: 10_000_000n,
  intervalLedgers: 720,
  totalCap: 120_000_000n,
  totalCharged: 30_000_000n,
  startLedger: 100,
  lastChargeLedger: 900,
  nextChargeLedger: 1_200, // in the future relative to ledgerState.sequence (1000)
  status: SubStatus.Active,
  planId: 0,
};

function renderCard(sub: Partial<Subscription> = {}) {
  return render(<SubscriptionCard sub={{ ...baseSub, ...sub }} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SubscriptionCard", () => {
  beforeEach(() => {
    mockedUsePlan.mockReset();
    mockedUsePlan.mockReturnValue(idlePlan as ReturnType<typeof usePlan>);
    ledgerState.sequence = 1000;
  });

  it("renders the subscription heading", () => {
    renderCard();
    expect(screen.getByTestId("sub-heading")).toHaveTextContent("Subscription #7");
  });

  it("renders the status badge", () => {
    renderCard();
    expect(screen.getByText(/Active/i)).toBeInTheDocument();
  });

  it("renders CapProgress and NextChargeCountdown child components", () => {
    renderCard();
    expect(screen.getByTestId("cap-progress")).toBeInTheDocument();
    expect(screen.getByTestId("next-charge-countdown")).toBeInTheDocument();
  });

  // ── Due-now badge ────────────────────────────────────────────────────────

  describe("Due now badge", () => {
    it("shows the Due now badge when nextChargeLedger is in the past", () => {
      // ledger 1000, nextChargeLedger 900 → overdue
      renderCard({ nextChargeLedger: 900 });
      expect(screen.getByTestId("due-now-badge")).toBeInTheDocument();
      expect(screen.getByTestId("due-now-badge")).toHaveTextContent("Due now");
    });

    it("shows the Due now badge when nextChargeLedger equals the current ledger", () => {
      renderCard({ nextChargeLedger: 1000 });
      expect(screen.getByTestId("due-now-badge")).toBeInTheDocument();
    });

    it("does NOT show the Due now badge when nextChargeLedger is in the future", () => {
      renderCard({ nextChargeLedger: 1200 });
      expect(screen.queryByTestId("due-now-badge")).not.toBeInTheDocument();
    });

    it("does NOT show the Due now badge for a Paused subscription even if ledger has passed", () => {
      renderCard({ nextChargeLedger: 900, status: SubStatus.Paused });
      expect(screen.queryByTestId("due-now-badge")).not.toBeInTheDocument();
    });

    it("does NOT show the Due now badge for a Cancelled subscription", () => {
      renderCard({ nextChargeLedger: 900, status: SubStatus.Cancelled });
      expect(screen.queryByTestId("due-now-badge")).not.toBeInTheDocument();
    });

    it("does NOT show the Due now badge for an Exhausted subscription", () => {
      renderCard({ nextChargeLedger: 900, status: SubStatus.Exhausted });
      expect(screen.queryByTestId("due-now-badge")).not.toBeInTheDocument();
    });
  });

  // ── Plan name ───────────────────────────────────────────────────────────

  describe("plan name", () => {
    it("does not render a plan name when planId is 0", () => {
      renderCard({ planId: 0 });
      expect(screen.queryByTestId("plan-name")).not.toBeInTheDocument();
      expect(screen.queryByTestId("plan-name-loading")).not.toBeInTheDocument();
    });

    it("shows a loading placeholder while the plan is fetching", () => {
      mockedUsePlan.mockReturnValue({
        data: undefined,
        loading: true,
        error: null,
      } as ReturnType<typeof usePlan>);

      renderCard({ planId: 42 });
      expect(screen.getByTestId("plan-name-loading")).toBeInTheDocument();
    });

    it("renders the plan name once loaded", () => {
      mockedUsePlan.mockReturnValue({
        data: { id: 42, name: "Pro Plan" },
        loading: false,
        error: null,
      } as ReturnType<typeof usePlan>);

      renderCard({ planId: 42 });
      expect(screen.getByTestId("plan-name")).toHaveTextContent("Pro Plan");
    });

    it("shows Plan unavailable when the plan fails to load", () => {
      mockedUsePlan.mockReturnValue({
        data: undefined,
        loading: false,
        error: new Error("network error"),
      } as ReturnType<typeof usePlan>);

      renderCard({ planId: 42 });
      expect(screen.getByTestId("plan-name-error")).toHaveTextContent("Plan unavailable");
    });
  });
});
