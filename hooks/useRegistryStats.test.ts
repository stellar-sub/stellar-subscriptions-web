import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRegistryStats } from "./useRegistryStats";
import { invalidateAsyncCache } from "./useAsync";
import type { RegistryStats } from "@/types";

// ── mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useWallet", () => ({
  useWallet: vi.fn(),
}));

vi.mock("@/lib/contracts", () => ({
  getRegistryStats: vi.fn(),
}));

import { useWallet } from "@/hooks/useWallet";
import { getRegistryStats } from "@/lib/contracts";

// ── fixtures ──────────────────────────────────────────────────────────────────

const STATS: RegistryStats = {
  totalPlans: 10,
  totalSubscriptions: 50,
  activeSubscriptions: 30,
  totalChargedVolume: 1_000_000_000n,
};

const STATS_V2: RegistryStats = {
  totalPlans: 12,
  totalSubscriptions: 55,
  activeSubscriptions: 32,
  totalChargedVolume: 2_000_000_000n,
};

function mockWallet(network: "testnet" | "mainnet" = "testnet") {
  vi.mocked(useWallet).mockReturnValue({
    network,
    address: null,
    walletNetwork: null,
    installed: false,
    connecting: false,
    error: null,
    accountSwitched: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    setNetwork: vi.fn(),
    clearAccountSwitchWarning: vi.fn(),
    writeCtx: vi.fn(),
  } as any);
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("useRegistryStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the module-level useAsync cache between tests.
    invalidateAsyncCache();
    mockWallet("testnet");
    vi.mocked(getRegistryStats).mockResolvedValue(STATS);
  });

  // ── data loading ──────────────────────────────────────────────────────────

  it("starts in a loading state before data resolves", () => {
    vi.mocked(getRegistryStats).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useRegistryStats());
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it("resolves data from getRegistryStats", async () => {
    const { result } = renderHook(() => useRegistryStats());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(STATS);
    expect(result.current.error).toBeNull();
  });

  it("calls getRegistryStats with the current wallet network", async () => {
    renderHook(() => useRegistryStats());

    await waitFor(() =>
      expect(vi.mocked(getRegistryStats)).toHaveBeenCalledWith("testnet"),
    );
  });

  // ── error handling ────────────────────────────────────────────────────────

  it("sets error when getRegistryStats rejects", async () => {
    const boom = new Error("RPC timeout");
    vi.mocked(getRegistryStats).mockRejectedValue(boom);

    const { result } = renderHook(() => useRegistryStats());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(boom);
    expect(result.current.data).toBeUndefined();
  });

  // ── refetch ───────────────────────────────────────────────────────────────

  it("exposes a refetch method", async () => {
    const { result } = renderHook(() => useRegistryStats());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refetch).toBe("function");
  });

  it("re-fetches fresh data when refetch is called", async () => {
    vi.mocked(getRegistryStats)
      .mockResolvedValueOnce(STATS)
      .mockResolvedValueOnce(STATS_V2);

    const { result } = renderHook(() => useRegistryStats());

    await waitFor(() => expect(result.current.data).toEqual(STATS));
    expect(vi.mocked(getRegistryStats)).toHaveBeenCalledTimes(1);

    act(() => { result.current.refetch(); });

    await waitFor(() => expect(result.current.data).toEqual(STATS_V2));
    expect(vi.mocked(getRegistryStats)).toHaveBeenCalledTimes(2);
  });

  it("keeps existing data visible while a refetch is in progress", async () => {
    let resolveSecond!: (v: RegistryStats) => void;
    vi.mocked(getRegistryStats)
      .mockResolvedValueOnce(STATS)
      .mockReturnValueOnce(
        new Promise<RegistryStats>((r) => { resolveSecond = r; }),
      );

    const { result } = renderHook(() => useRegistryStats());
    await waitFor(() => expect(result.current.data).toEqual(STATS));

    act(() => { result.current.refetch(); });

    // Previous data stays on screen while the refetch is in flight
    expect(result.current.data).toEqual(STATS);

    await act(async () => { resolveSecond(STATS_V2); });
    await waitFor(() => expect(result.current.data).toEqual(STATS_V2));
  });

  // ── network switch ────────────────────────────────────────────────────────

  it("re-fetches when the network changes", async () => {
    const mainnetStats: RegistryStats = { ...STATS, totalPlans: 99 };

    vi.mocked(getRegistryStats)
      .mockResolvedValueOnce(STATS)
      .mockResolvedValueOnce(mainnetStats);

    const { result, rerender } = renderHook(() => useRegistryStats());
    await waitFor(() => expect(result.current.data).toEqual(STATS));

    mockWallet("mainnet");
    rerender();

    await waitFor(() => expect(result.current.data).toEqual(mainnetStats));
    expect(vi.mocked(getRegistryStats)).toHaveBeenCalledWith("mainnet");
  });
});
