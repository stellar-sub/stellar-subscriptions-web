"use client";

import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { usePublicClient } from "wagmi";
import type { PublicClient } from "viem";

/** How often the shared ledger clock ticks, in milliseconds. */
export const LEDGER_POLL_INTERVAL_MS = 15_000;

export type LedgerClock = {
  /** Monotonically increasing tick counter, bumped once per poll interval. */
  tick: number;
  /** The public client used to read the ledger. */
  client: PublicClient | undefined;
};

const LedgerClockContext = createContext<LedgerClock | null>(null);

/**
 * Provides a single ledger clock for the whole page so that every consumer
 * shares one polling timer instead of starting its own.
 */
export function LedgerClockProvider({ children }: { children: ReactNode }) {
  const client = usePublicClient();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, LEDGER_POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  return createElement(LedgerClockContext.Provider, { value: { tick, client } }, children);
}

/**
 * Reads the shared ledger clock. Falls back to a local clock when no provider
 * is mounted so existing call sites keep working.
 */
export function useLedger(): LedgerClock {
  const shared = useContext(LedgerClockContext);
  const client = usePublicClient();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (shared) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, LEDGER_POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [shared]);

  if (shared) return shared;
  return { tick, client };
}
