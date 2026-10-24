import { useCallback, useEffect, useRef, useState } from 'react';

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
}

type Fetcher = () => Promise<TokenMetadata>;

interface CacheEntry {
  data: TokenMetadata;
  timestamp: number;
}

const STALE_TIME = 30_000;

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<TokenMetadata>>();

function cacheKey(address: string): string {
  return `token:${address.toLowerCase()}`;
}

/**
 * Invalidate cached token metadata. Call after any write that mutates token
 * state so stale data is never shown following a mutation.
 */
export function invalidateToken(address?: string): void {
  if (address) {
    cache.delete(cacheKey(address));
    inflight.delete(cacheKey(address));
    return;
  }
  cache.clear();
  inflight.clear();
}

async function fetchAndCache(address: string, fetcher: Fetcher): Promise<TokenMetadata> {
  const key = cacheKey(address);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = fetcher()
    .then((data) => {
      cache.set(key, { data, timestamp: Date.now() });
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

/**
 * Warm the token metadata cache ahead of navigation (e.g. on hover/focus of a
 * plan card). Dedupes against any in-flight request and skips the network when
 * fresh data is already cached, so no request is repeated.
 */
export function prefetchToken(address: string | undefined, fetcher: Fetcher): void {
  if (!address) return;
  const key = cacheKey(address);
  if (inflight.has(key)) return;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp <= STALE_TIME) return;
  void fetchAndCache(address, fetcher).catch(() => {
    // Prefetch failures are non-fatal; the hook will retry on mount.
  });
}

export interface UseTokenResult {
  data: TokenMetadata | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Reads token metadata with stale-while-revalidate semantics: cached data is
 * returned immediately (e.g. on back-navigation) and refreshed quietly in the
 * background when stale.
 */
export function useToken(address: string | undefined, fetcher: Fetcher): UseTokenResult {
  const [data, setData] = useState<TokenMetadata | null>(() =>
    address ? cache.get(cacheKey(address))?.data ?? null : null,
  );
  const [loading, setLoading] = useState<boolean>(!address || !cache.has(cacheKey(address)));
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const revalidate = useCallback(
    async (addr: string) => {
      try {
        const fresh = await fetchAndCache(addr, () => fetcherRef.current());
        setData(fresh);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!address) {
      setData(null);
      setLoading(false);
      return;
    }

    const key = cacheKey(address);
    const cached = cache.get(key);

    if (cached) {
      setData(cached.data);
      setLoading(false);
      if (Date.now() - cached.timestamp > STALE_TIME) {
        void revalidate(address);
      }
      return;
    }

    setLoading(true);
    void revalidate(address);
  }, [address, revalidate]);

  const refresh = useCallback(async () => {
    if (!address) return;
    invalidateToken(address);
    setLoading(true);
    await revalidate(address);
  }, [address, revalidate]);

  return { data, loading, error, refresh };
}
