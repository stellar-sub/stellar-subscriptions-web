"use client";

import { useCallback, useState } from "react";
import { ContractError, type WriteCtx } from "@/lib/stellar";
import { useWallet } from "@/hooks/useWallet";
import type { TxPhase, TxResult } from "@/types";

export interface TxState {
  phase: TxPhase;
  hash: string | null;
  error: string | null;
  /** True from the first step until success or failure. */
  pending: boolean;
  /** Run one write, tracking its phases. Resolves to null on failure. */
  run: <T extends TxResult>(action: (ctx: WriteCtx) => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

const PENDING: TxPhase[] = ["checking", "building", "signing", "submitting", "confirming"];

/** Drives a single on-chain write so the UI can show where it is. */
export function useTx(): TxState {
  const { writeCtx } = useWallet();
  const [phase, setPhase] = useState<TxPhase>("idle");
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setHash(null);
    setError(null);
  }, []);

  const run = useCallback(
    async <T extends TxResult>(action: (ctx: WriteCtx) => Promise<T>): Promise<T | null> => {
      setError(null);
      setHash(null);
      setPhase("building");
      try {
        const result = await action(writeCtx(setPhase));
        setHash(result.hash);
        setPhase("success");
        return result;
      } catch (e) {
        if (e instanceof ContractError && e.detail) console.error(e.message, e.detail);
        setError(e instanceof Error ? e.message : "Something went wrong. Nothing was changed.");
        setPhase("error");
        return null;
      }
    },
    [writeCtx],
  );

  return { phase, hash, error, pending: PENDING.includes(phase), run, reset };
}
