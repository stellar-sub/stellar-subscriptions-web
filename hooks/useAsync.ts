"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  /** Run the loader again, keeping current data on screen meanwhile. */
  reload: () => void;
}

interface CacheEntry {
  data: unknown;
  /** Bumped on every write so in-flight reads can detect staleness. */
  version: number;
}

/**
 * Module-level cache shared across mounts. Keyed by the caller-supplied
 * `cacheKey`, it lets back-navigation paint cached data immediately while a
 * background revalidation refreshes it quietly (stale-while-revalidate).
 */
const cache = new Map<string, CacheEntry>();

/**
 * Drop cached entries. Call after a write so stale data is never shown again.
 * Pass a key to invalidate one entry, or omit it to clear everything.
 */
export function invalidateAsyncCache(cacheKey?: string): void {
  if (cacheKey === undefined) {
    cache.clear();
    return;
  }
  cache.delete(cacheKey);
}

/**
 * Load data with `load` whenever `deps` change. Pass `null` to stay idle,
 * e.g. while no wallet is connected. Stale responses from an earlier run are
 * discarded, so switching accounts can never show the previous account's data.
 *
 * When `cacheKey` is provided, cached data is shown immediately on mount and
 * revalidated in the background. Call `invalidateAsyncCache(cacheKey)` after a
 * write to guarantee stale data is never served.
 */
export function useAsync<T>(
  load: (() => Promise<T>) | null,
  deps: readonly unknown[],
  cacheKey?: string,
): AsyncState<T> {
  const [data, setData] = useState<T>(() =>
    cacheKey !== undefined ? (cache.get(cacheKey)?.data as T | undefined) : undefined,
  );
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(Boolean(load));
  const [generation, setGeneration] = useState(0);

  const reload = useCallback(() => setGeneration((g) => g + 1), []);

  // Keep the latest cache key in a ref so the effect can read it without
  // re-running when only the key changes identity.
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;

  useEffect(() => {
    if (!load) {
      setData(undefined);
      setError(null);
      setLoading(false);
      return;
    }
    let current = true;
    const key = cacheKeyRef.current;
    const cached = key !== undefined ? cache.get(key) : undefined;
    if (cached) {
      // Paint cached data immediately; revalidate quietly below.
      setData(cached.data as T);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);
    const versionAtStart = cached?.version ?? -1;
    load().then(
      (value) => {
        if (!current) return;
        if (key !== undefined) {
          const existing = cache.get(key);
          // A write invalidated the entry while we were in flight; don't
          // resurrect stale data.
          if (existing && existing.version !== versionAtStart) return;
          cache.set(key, { data: value, version: (existing?.version ?? 0) + 1 });
        }
        setData(value);
        setLoading(false);
      },
      (e: unknown) => {
        if (!current) return;
        setError(e);
        setLoading(false);
      },
    );
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` is recreated every render; `deps` says when it actually changes.
  }, [...deps, generation, load === null]);

  return { data, error, loading, reload };
}
