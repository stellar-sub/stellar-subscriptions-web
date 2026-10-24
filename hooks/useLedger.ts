"use client";

import { useEffect, useState } from "react";
import { getLatestLedger } from "@/lib/stellar";
import type { Network } from "@/types";

export interface LedgerClock {
  /**
   * Latest ledger sequence seen, or null before the first answer. This is the
   * single shared ledger value: pass it to `dueSubscriptions` (in
   * `lib/subscription.ts`) so rows that are clearly not due are filtered out
   * before the contract is asked.
   */
  sequence: number | null;
  /** When that sequence was observed (ms since epoch). */
  observedAt: number;
  /** True when the most recent refresh failed. */
  degraded: boolean;
  /** Number of consecutive failed refreshes since the last success. */
  consecutiveFailures: number;
  /** True when the data is out of date (one or more consecutive failures). */
  stale: boolean;
}

/**
 * The network's latest ledger, refreshed every `intervalMs`. Countdowns use
 * this rather than the local clock, because the contracts schedule charges
 * by ledger number.
 */
export function useLedger(network: Network, intervalMs = 15_000): LedgerClock {
  const [clock, setClock] = useState<LedgerClock>({
    sequence: null,
    observedAt: 0,
    degraded: false,
    consecutiveFailures: 0,
    stale: false,
  });

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const sequence = await getLatestLedger(network);
        if (active) {
          setClock({
            sequence,
            observedAt: Date.now(),
            degraded: false,
            consecutiveFailures: 0,
            stale: false,
          });
        }
      } catch {
        // Keep the last known ledger but flag it as stale; the next tick retries.
        if (active) {
          setClock((prev) => {
            const consecutiveFailures = prev.consecutiveFailures + 1;
            return {
              ...prev,
              degraded: true,
              consecutiveFailures,
              stale: true,
            };
          });
        }
      }
    };
    void tick();
    const timer = setInterval(tick, intervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [network, intervalMs]);

  return clock;
}