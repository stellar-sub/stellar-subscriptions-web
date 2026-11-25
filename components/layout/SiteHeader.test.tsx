import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SiteHeader } from "./SiteHeader";
import { WalletContext, type WalletState } from "@/hooks/useWallet";
import { SubStatus, type Subscription } from "@/types";

// ── mocks ─────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/"),
}));

vi.mock("@/hooks/useSubscriptions", () => ({
  useMerchantSubscriptions: vi.fn(),
}));

vi.mock("@/hooks/useLedger", () => ({
  useLedger: vi.fn(),
}));

// Stub out child components that need their own providers
vi.mock("@/components/wallet/ConnectButton", () => ({
  ConnectButton: () => <button>Connect</button>,
}));
vi.mock("@/components/wallet/NetworkSelector", () => ({
  NetworkSelector: () => <select aria-label="Network" />,
}));
vi.mock("./ThemeToggle", () => ({
  ThemeToggle: () => <button>Theme</button>,
}));

import { useMerchantSubscriptions } from "@/hooks/useSubscriptions";
import { useLedger } from "@/hooks/useLedger";

// ── fixtures ──────────────────────────────────────────────────────────────────

const ADDR = "GBKAVFZ5GCZMMIV3ZKZL5USKFYT5DBBZTY4P5V5J75ANHWTX7GASETK4";

const baseSub: Subscription = {
  id: 1,
  subscriber: "GSUB111111111111111111111111111111111111111111111111111111",
  merchant: ADDR,
  token: "CTOKEN1111111111111111111111111111111111111111111111111111",
  amountPerPeriod: 1_000_000n,
  intervalLedgers: 100,
  totalCap: 10_000_000n,
  totalCharged: 1_000_000n,
  startLedger: 1000,
  lastChargeLedger: 1100,
  nextChargeLedger: 1200,
  status: SubStatus.Active,
  planId: 0,
};

function makeWalletValue(overrides: Partial<WalletState> = {}): WalletState {
  return {
    address: ADDR,
    network: "testnet",
    walletNetwork: "testnet",
    installed: true,
    connecting: false,
    error: null,
    accountSwitched: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    setNetwork: vi.fn(),
    clearAccountSwitchWarning: vi.fn(),
    writeCtx: vi.fn(),
    ...overrides,
  } as WalletState;
}

function idleAsync<T>(data?: T) {
  return { data, loading: false, error: null, reload: vi.fn() };
}

function renderHeader(walletOverrides: Partial<WalletState> = {}) {
  return render(
    <WalletContext.Provider value={makeWalletValue(walletOverrides)}>
      <SiteHeader />
    </WalletContext.Provider>,
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("SiteHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no subs, ledger at 2000 (future relative to baseSub)
    vi.mocked(useMerchantSubscriptions).mockReturnValue(idleAsync([]));
    vi.mocked(useLedger).mockReturnValue({
      sequence: 2000,
      observedAt: Date.now(),
      degraded: false,
      consecutiveFailures: 0,
      stale: false,
    });
  });

  // ── nav link presence ─────────────────────────────────────────────────────

  it("renders all three nav links", () => {
    renderHeader();
    expect(screen.getAllByRole("link", { name: /plans/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /my subscriptions/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /merchant/i })[0]).toBeInTheDocument();
  });

  // ── no badge when nothing is due ──────────────────────────────────────────

  it("shows no badge when there are no due subscriptions", () => {
    vi.mocked(useMerchantSubscriptions).mockReturnValue(idleAsync([]));
    renderHeader();
    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
    // Badge aria-label contains "charges due"
    expect(screen.queryByLabelText(/charge.*due/i)).not.toBeInTheDocument();
  });

  it("shows no badge when subs are not yet loaded", () => {
    vi.mocked(useMerchantSubscriptions).mockReturnValue({
      data: undefined,
      loading: true,
      error: null,
      reload: vi.fn(),
    });
    renderHeader();
    expect(screen.queryByLabelText(/charge.*due/i)).not.toBeInTheDocument();
  });

  it("shows no badge when ledger sequence is not yet known", () => {
    vi.mocked(useMerchantSubscriptions).mockReturnValue(
      idleAsync([{ ...baseSub, nextChargeLedger: 1900 }]),
    );
    vi.mocked(useLedger).mockReturnValue({
      sequence: null,
      observedAt: 0,
      degraded: false,
      consecutiveFailures: 0,
      stale: false,
    });
    renderHeader();
    expect(screen.queryByLabelText(/charge.*due/i)).not.toBeInTheDocument();
  });

  // ── badge appears when subs are due ──────────────────────────────────────

  it("shows a badge with the due count when subscriptions are due", () => {
    // nextChargeLedger 1900 <= currentLedger 2000 → due
    vi.mocked(useMerchantSubscriptions).mockReturnValue(
      idleAsync([{ ...baseSub, nextChargeLedger: 1900 }]),
    );
    renderHeader();
    expect(screen.getByLabelText(/1 charge due/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/1 charge due/i)).toHaveTextContent("1");
  });

  it("counts only active subscriptions that have passed their charge ledger", () => {
    vi.mocked(useMerchantSubscriptions).mockReturnValue(
      idleAsync([
        { ...baseSub, id: 1, nextChargeLedger: 1900, status: SubStatus.Active }, // due
        { ...baseSub, id: 2, nextChargeLedger: 1950, status: SubStatus.Active }, // due
        { ...baseSub, id: 3, nextChargeLedger: 2100, status: SubStatus.Active }, // not yet due
        { ...baseSub, id: 4, nextChargeLedger: 1900, status: SubStatus.Paused }, // paused — excluded
        { ...baseSub, id: 5, nextChargeLedger: 1900, status: SubStatus.Cancelled }, // cancelled — excluded
      ]),
    );
    renderHeader();
    expect(screen.getByLabelText(/2 charges due/i)).toHaveTextContent("2");
  });

  // ── count capping at 99+ ──────────────────────────────────────────────────

  it("displays '99+' when more than 99 subscriptions are due", () => {
    const manySubs: Subscription[] = Array.from({ length: 105 }, (_, i) => ({
      ...baseSub,
      id: i + 1,
      nextChargeLedger: 1900, // all due
    }));
    vi.mocked(useMerchantSubscriptions).mockReturnValue(idleAsync(manySubs));
    renderHeader();

    const badge = screen.getByLabelText(/more than 99 charges due/i);
    expect(badge).toHaveTextContent("99+");
  });

  it("displays '99' (not '99+') when exactly 99 are due", () => {
    const subs: Subscription[] = Array.from({ length: 99 }, (_, i) => ({
      ...baseSub,
      id: i + 1,
      nextChargeLedger: 1900,
    }));
    vi.mocked(useMerchantSubscriptions).mockReturnValue(idleAsync(subs));
    renderHeader();

    const badge = screen.getByLabelText(/99 charges due/i);
    expect(badge).toHaveTextContent("99");
    expect(badge).not.toHaveTextContent("99+");
  });

  // ── disconnected wallet ───────────────────────────────────────────────────

  it("passes null to useMerchantSubscriptions when no wallet is connected", () => {
    renderHeader({ address: null });
    expect(vi.mocked(useMerchantSubscriptions)).toHaveBeenCalledWith(null);
  });
});
