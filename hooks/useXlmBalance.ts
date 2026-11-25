'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useLedger } from '@/hooks/useLedger';
import { getTokenBalance } from '@/lib/contracts';
import { nativeTokenId } from '@/lib/stellar';

export interface UseXlmBalanceResult {
  balance: string | null;
  loading: boolean;
  error: Error | null;
}

export function useXlmBalance(): UseXlmBalanceResult {
  const { network, address } = useWallet();
  const ledger = useLedger(network);

  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const ledgerSequence =
    ledger && typeof ledger === 'object' && 'sequence' in ledger
      ? (ledger as { sequence: number | null }).sequence
      : null;

  useEffect(() => {
    if (!address) {
      setBalance(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;

    const fetchBalance = async () => {
      setLoading(true);
      setError(null);

      try {
        const tokenId = nativeTokenId(network);
        const result = await getTokenBalance(network, tokenId, address);

        if (active) {
          setBalance(result);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchBalance();

    return () => {
      active = false;
    };
  }, [network, address, ledgerSequence]);

  return { balance, loading, error };
}

export default useXlmBalance;
```

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useXlmBalance } from './useXlmBalance';

const mockGetTokenBalance = vi.fn();
const mockGetLatestLedger = vi.fn();
const mockNativeTokenId = vi.fn();

vi.mock('@/lib/contracts', () => ({
  getTokenBalance: (...args: unknown[]) => mockGetTokenBalance(...args),
}));

vi.mock('@/lib/stellar', () => ({
  getLatestLedger: (...args: unknown[]) => mockGetLatestLedger(...args),
  nativeTokenId: (...args: unknown[]) => mockNativeTokenId(...args),
}));

const mockUseWallet = vi.fn();
vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => mockUseWallet(),
}));

const mockUseLedger = vi.fn();
vi.mock('@/hooks/useLedger', () => ({
  useLedger: (...args: unknown[]) => mockUseLedger(...args),
}));

describe('useXlmBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNativeTokenId.mockReturnValue('native-token-id');
    mockGetLatestLedger.mockResolvedValue({ sequence: 1 });
  });

  it('fetches the native balance for the connected address', async () => {
    mockUseWallet.mockReturnValue({
      network: 'testnet',
      address: 'GABC123',
    });
    mockUseLedger.mockReturnValue({ sequence: 1 });
    mockGetTokenBalance.mockResolvedValue('100.0000000');

    const { result } = renderHook(() => useXlmBalance());

    await waitFor(() => {
      expect(result.current.balance).toBe('100.0000000');
    });

    expect(mockNativeTokenId).toHaveBeenCalledWith('testnet');
    expect(mockGetTokenBalance).toHaveBeenCalledWith(
      'testnet',
      'native-token-id',
      'GABC123',
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('refetches the balance when the ledger sequence changes', async () => {
    mockUseWallet.mockReturnValue({
      network: 'testnet',
      address: 'GABC123',
    });
    mockUseLedger.mockReturnValue({ sequence: 1 });
    mockGetTokenBalance.mockResolvedValueOnce('100.0000000');

    const { result, rerender } = renderHook(() => useXlmBalance());

    await waitFor(() => {
      expect(result.current.balance).toBe('100.0000000');
    });

    expect(mockGetTokenBalance).toHaveBeenCalledTimes(1);

    mockUseLedger.mockReturnValue({ sequence: 2 });
    mockGetTokenBalance.mockResolvedValueOnce('150.0000000');

    rerender();

    await waitFor(() => {
      expect(result.current.balance).toBe('150.0000000');
    });

    expect(mockGetTokenBalance).toHaveBeenCalledTimes(2);
  });

  it('skips fetching when no address is connected', async () => {
    mockUseWallet.mockReturnValue({
      network: 'testnet',
      address: null,
    });
    mockUseLedger.mockReturnValue({ sequence: 1 });

    const { result } = renderHook(() => useXlmBalance());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetTokenBalance).not.toHaveBeenCalled();
    expect(result.current.balance).toBeNull();
  });

  it('captures errors from the RPC layer', async () => {
    mockUseWallet.mockReturnValue({
      network: 'testnet',
      address: 'GABC123',
    });
    mockUseLedger.mockReturnValue({ sequence: 1 });
    mockGetTokenBalance.mockRejectedValue(new Error('rpc failed'));

    const { result } = renderHook(() => useXlmBalance());

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.error?.message).toBe('rpc failed');
    expect(result.current.loading).toBe(false);
  });
});