import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMerchantStats } from './useMerchantStats';
import { useMerchantSubscriptions } from './useMerchantSubscriptions';

vi.mock('./useMerchantSubscriptions', () => ({
  useMerchantSubscriptions: vi.fn(),
}));

const mockUseMerchantSubscriptions = vi.mocked(useMerchantSubscriptions);

interface MockSubscription {
  id: string;
  token: string;
  status: 'active' | 'cancelled' | 'past_due';
  nextDueAt?: string;
  amount?: number;
}

interface MockChargeEvent {
  id: string;
  token: string;
  amount: number;
  createdAt: string;
}

function setupSubscriptions(
  overrides: Partial<ReturnType<typeof useMerchantSubscriptions>> = {},
) {
  mockUseMerchantSubscriptions.mockReturnValue({
    subscriptions: [],
    loading: false,
    error: null,
    ...overrides,
  } as ReturnType<typeof useMerchantSubscriptions>);
}

describe('useMerchantStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes due count, active count, and per-token revenue from normal data', () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = new Date(
      startOfMonth.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const lastMonth = new Date(
      startOfMonth.getTime() - 24 * 60 * 60 * 1000,
    ).toISOString();
    const dueSoon = new Date(
      now.getTime() + 3 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const dueLater = new Date(
      now.getTime() + 60 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const subscriptions: MockSubscription[] = [
      {
        id: 'sub_1',
        token: 'USDC',
        status: 'active',
        nextDueAt: dueSoon,
        amount: 100,
      },
      {
        id: 'sub_2',
        token: 'USDC',
        status: 'active',
        nextDueAt: dueLater,
        amount: 50,
      },
      {
        id: 'sub_3',
        token: 'XLM',
        status: 'active',
        nextDueAt: dueSoon,
        amount: 200,
      },
      {
        id: 'sub_4',
        token: 'USDC',
        status: 'cancelled',
        nextDueAt: dueSoon,
        amount: 999,
      },
    ];

    const chargeEvents: MockChargeEvent[] = [
      { id: 'ch_1', token: 'USDC', amount: 100, createdAt: thisMonth },
      { id: 'ch_2', token: 'USDC', amount: 25, createdAt: thisMonth },
      { id: 'ch_3', token: 'XLM', amount: 200, createdAt: thisMonth },
      { id: 'ch_4', token: 'USDC', amount: 500, createdAt: lastMonth },
    ];

    setupSubscriptions({ subscriptions: subscriptions as never });

    const { result } = renderHook(() =>
      useMerchantStats({ chargeEvents: chargeEvents as never }),
    );

    expect(result.current.dueCount).toBe(2);
    expect(result.current.activeCount).toBe(3);
    expect(result.current.revenueThisMonth).toEqual({
      USDC: 125,
      XLM: 200,
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns zero counts and empty revenue for empty data', () => {
    setupSubscriptions({ subscriptions: [] });

    const { result } = renderHook(() =>
      useMerchantStats({ chargeEvents: [] }),
    );

    expect(result.current.dueCount).toBe(0);
    expect(result.current.activeCount).toBe(0);
    expect(result.current.revenueThisMonth).toEqual({});
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('exposes the loading state from subscriptions', () => {
    setupSubscriptions({ subscriptions: [], loading: true });

    const { result } = renderHook(() =>
      useMerchantStats({ chargeEvents: [] }),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.dueCount).toBe(0);
    expect(result.current.activeCount).toBe(0);
    expect(result.current.revenueThisMonth).toEqual({});
  });

  it('exposes the error state from subscriptions', () => {
    const error = new Error('failed to load subscriptions');
    setupSubscriptions({ subscriptions: [], error });

    const { result } = renderHook(() =>
      useMerchantStats({ chargeEvents: [] }),
    );

    expect(result.current.error).toBe(error);
    expect(result.current.loading).toBe(false);
    expect(result.current.dueCount).toBe(0);
    expect(result.current.activeCount).toBe(0);
    expect(result.current.revenueThisMonth).toEqual({});
  });
});