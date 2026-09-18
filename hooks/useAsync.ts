"use client";

import { useCallback, useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  /** Run the loader again, keeping current data on screen meanwhile. */
  reload: () => void;
}

/**
 * Load data with `load` whenever `deps` change. Pass `null` to stay idle,
 * e.g. while no wallet is connected. Stale responses from an earlier run are
 * discarded, so switching accounts can never show the previous account's data.
 */
export function useAsync<T>(load: (() => Promise<T>) | null, deps: readonly unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(Boolean(load));
  const [generation, setGeneration] = useState(0);

  const reload = useCallback(() => setGeneration((g) => g + 1), []);

  useEffect(() => {
    if (!load) {
      setData(undefined);
      setError(null);
      setLoading(false);
      return;
    }
    let current = true;
    setLoading(true);
    setError(null);
    load().then(
      (value) => {
        if (!current) return;
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
    // `load` is recreated every render; `deps` says when it actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, generation, load === null]);

  return { data, error, loading, reload };
}
