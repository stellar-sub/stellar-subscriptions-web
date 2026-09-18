"use client";

import { useEffect, useState } from "react";
import { getLatestLedger } from "@/lib/stellar";
import type { Network } from "@/types";

export interface LedgerClock {
  /** Latest ledger sequence seen, or null before the first answer. */
  sequence: number | null;
  /** When that sequence was observed (ms since epoch). */
  observedAt: number;
}

/**
 * The network's latest ledger, refreshed every `intervalMs`. Countdowns use
 * this rather than the local clock, because the contracts schedule charges
 * by ledger number.
 */
export function useLedger(network: Network, intervalMs = 15_000): LedgerClock {
  const [clock, setClock] = useState<LedgerClock>({ sequence: null, observedAt: 0 });

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const sequence = await getLatestLedger(network);
        if (active) setClock({ sequence, observedAt: Date.now() });
      } catch {
        // Keep the last known ledger; the next tick tries again.
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
