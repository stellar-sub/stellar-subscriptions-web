"use client";

import { useAsync } from "@/hooks/useAsync";
import { useWallet } from "@/hooks/useWallet";
import { getRegistryStats } from "@/lib/contracts";
import type { RegistryStats } from "@/types";

/** Cache key shared across all mounts; network-scoped so testnet and mainnet are independent. */
function registryStatsCacheKey(network: string): string {
  return `registry-stats:${network}`;
}

/**
 * Live totals from the registry contract, with stale-while-revalidate caching.
 *
 * - `data`    — the latest `RegistryStats`, or `undefined` on the first load.
 * - `loading` — true during the initial fetch; false during background revalidation.
 * - `error`   — set when the most recent fetch failed.
 * - `refetch` — manually trigger a fresh fetch (alias for `reload`).
 */
export function useRegistryStats(): ReturnType<typeof useAsync<RegistryStats>> & {
  refetch: () => void;
} {
  const { network } = useWallet();
  const state = useAsync(
    () => getRegistryStats(network),
    [network],
    registryStatsCacheKey(network),
  );

  return { ...state, refetch: state.reload };
}
