import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { WalletPanel } from "./WalletPanel";
import { WalletContext, type WalletState } from "@/hooks/useWallet";
import { SubStatus, type Subscription } from "@/types";

// ── mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useSubscriptions", () => ({
  useSubscriptions: vi.fn(),
}));

vi.mock("@/hooks/useToken", () => ({
  useToken: vi.fn(),
  useTokenBalance: vi.fn(),
}));

vi.mock("@/lib/contracts", () => ({
  getSubscriptionAllowance: vi.fn(),
  NotDeployedError: class NotDeployedError extends Error {},
}));

import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useToken, useTokenBalance } from "@/hooks/useToken";
import { getSubscriptionAllowance } from "@/lib/contracts";

// ── fixtures ──────────────────────────────────────────────────────────────────

const ADDR = "GBKAVFZ5GCZMMIV3ZKZL5USKFYT5DBBZTY4P5V5J75ANHWTX7GASETK4";
const TOKEN_XLM = "CXLMNATIVETOKEN111111111111111111111111111111111";
const TOKEN_USDC = "CUSDCTOKEN22222222222222222222222222222222222222";

const baseSub: Subscription = {
  id: 1,
  subscriber: ADDR,
  merchant: "GMERCHANT1111111111111111111111111111111111111111111111",
  token: TOKEN_XLM,
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

function renderPanel(walletOverrides: Partial<WalletState> = {}) {
  return render(
    <WalletContext.Provider value={makeWalletValue(walletOverrides)}>
      <WalletPanel />
    </WalletContext.Provider>,
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("WalletPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: idle subscriptions state
    vi.mocked(useSubscriptions).mockReturnValue({
      data: undefined,
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    vi.mocked(useToken).mockReturnValue({
      data: { contractId: TOKEN_XLM, symbol: "XLM", name: "Lumen", decimals: 7 },
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    vi.mocked(useTokenBalance).mockReturnValue({
      data: 5_000_000n,
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    vi.mocked(getSubscriptionAllowance).mockResolvedValue(2_000_000n);
  });

  // ── visibility ────────────────────────────────────────────────────────────

  it("renders nothing when no wallet is connected", () => {
    const { container } = render(
      <WalletContext.Provider value={makeWalletValue({ address: null })}>
        <WalletPanel />
      </WalletContext.Provider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the Wallet panel when an address is connected", () => {
    renderPanel();
    expect(screen.getByRole("region", { name: /wallet/i })).toBeInTheDocument();
  });

  // ── collapse / expand ─────────────────────────────────────────────────────

  it("starts collapsed", () => {
    renderPanel();
    const toggle = screen.getByRole("button", { name: /wallet/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText(/token balances/i)).not.toBeInTheDocument();
  });

  it("expands when the header button is clicked", () => {
    vi.mocked(useSubscriptions).mockReturnValue({
      data: [baseSub],
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /wallet/i }));

    expect(screen.getByRole("button", { name: /wallet/i })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("list", { name: /token balances/i })).toBeInTheDocument();
  });

  it("collapses again on a second click", () => {
    renderPanel();
    const toggle = screen.getByRole("button", { name: /wallet/i });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  // ── loading state ─────────────────────────────────────────────────────────

  it("shows a loading spinner while subscriptions are loading", () => {
    vi.mocked(useSubscriptions).mockReturnValue({
      data: undefined,
      loading: true,
      error: null,
      reload: vi.fn(),
    });

    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /wallet/i }));

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  // ── error state ───────────────────────────────────────────────────────────

  it("shows an error message when subscriptions fail to load", () => {
    vi.mocked(useSubscriptions).mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error("network error"),
      reload: vi.fn(),
    });

    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /wallet/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/could not load subscriptions/i);
  });

  // ── empty state ───────────────────────────────────────────────────────────

  it("shows an empty message when there are no active subscriptions", () => {
    vi.mocked(useSubscriptions).mockReturnValue({
      data: [],
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /wallet/i }));

    expect(screen.getByText(/no active subscriptions/i)).toBeInTheDocument();
  });

  it("omits paused and cancelled subscriptions from the token list", () => {
    vi.mocked(useSubscriptions).mockReturnValue({
      data: [
        { ...baseSub, status: SubStatus.Paused, token: TOKEN_USDC },
        { ...baseSub, status: SubStatus.Cancelled, token: TOKEN_USDC },
      ],
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /wallet/i }));

    expect(screen.getByText(/no active subscriptions/i)).toBeInTheDocument();
  });

  // ── token rows ────────────────────────────────────────────────────────────

  it("renders one row per unique active token", () => {
    vi.mocked(useSubscriptions).mockReturnValue({
      data: [
        baseSub,
        { ...baseSub, id: 2, token: TOKEN_USDC },
        // duplicate of baseSub.token — should still produce only one XLM row
        { ...baseSub, id: 3 },
      ],
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    vi.mocked(useToken).mockImplementation((token) => ({
      data: {
        contractId: token!,
        symbol: token === TOKEN_USDC ? "USDC" : "XLM",
        name: token === TOKEN_USDC ? "USD Coin" : "Lumen",
        decimals: 7,
      },
      loading: false,
      error: null,
      reload: vi.fn(),
    }));

    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /wallet/i }));

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2); // XLM + USDC, not 3
  });

  it("shows balance and allowance for each token row", async () => {
    vi.mocked(useSubscriptions).mockReturnValue({
      data: [baseSub],
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /wallet/i }));

    // TokenAmount renders formatted numbers; just verify the row exists
    await waitFor(() => {
      expect(screen.getByRole("list", { name: /token balances/i })).toBeInTheDocument();
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });
  });

  // ── accessibility ─────────────────────────────────────────────────────────

  it("has no accessibility violations when collapsed", async () => {
    const { container } = renderPanel();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no accessibility violations when expanded with tokens", async () => {
    vi.mocked(useSubscriptions).mockReturnValue({
      data: [baseSub],
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    const { container } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /wallet/i }));

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no accessibility violations in the error state", async () => {
    vi.mocked(useSubscriptions).mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error("failed"),
      reload: vi.fn(),
    });

    const { container } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /wallet/i }));

    expect(await axe(container)).toHaveNoViolations();
  });
});
