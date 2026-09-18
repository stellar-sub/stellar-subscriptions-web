"use client";

import { explorerTxUrl } from "@/lib/stellar";
import type { Network, TxPhase } from "@/types";
import { Spinner } from "./Spinner";

const STEPS: { phase: TxPhase; label: string }[] = [
  { phase: "checking", label: "Checking with the contract that this is allowed right now" },
  { phase: "building", label: "Preparing the transaction" },
  { phase: "signing", label: "Waiting for your approval in Freighter" },
  { phase: "submitting", label: "Sending to the network" },
  { phase: "confirming", label: "Waiting for the ledger to confirm" },
];

/**
 * Step-by-step progress for one transaction, from preparation to
 * confirmation, ending in a success line with an explorer link or a plain
 * error message.
 */
export function TxProgress({
  phase,
  hash,
  error,
  network,
  successText,
  withCheck = false,
  onDismiss,
}: {
  phase: TxPhase;
  hash: string | null;
  error: string | null;
  network: Network;
  successText: string;
  /** Show the on-chain eligibility check step (used for charges). */
  withCheck?: boolean;
  onDismiss?: () => void;
}) {
  if (phase === "idle") return null;

  const steps = withCheck ? STEPS : STEPS.slice(1);
  const current = steps.findIndex((s) => s.phase === phase);

  return (
    <div className="rounded-lg border border-line bg-raised/60 p-4 text-sm" aria-live="polite">
      {phase !== "success" && phase !== "error" && (
        <ol className="space-y-2">
          {steps.map((step, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={step.phase} className={`flex items-center gap-2 ${active ? "text-fg" : done ? "text-muted" : "text-muted/60"}`}>
                <span className="flex h-4 w-4 items-center justify-center">
                  {active ? <Spinner label={step.label} /> : done ? "✓" : "·"}
                </span>
                {step.label}
              </li>
            );
          })}
        </ol>
      )}

      {phase === "success" && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-ok">✓ {successText}</p>
          <div className="flex items-center gap-3">
            {hash && (
              <a href={explorerTxUrl(network, hash)} target="_blank" rel="noreferrer" className="text-muted underline-offset-2 hover:text-fg hover:underline">
                View transaction
              </a>
            )}
            {onDismiss && (
              <button type="button" onClick={onDismiss} className="text-muted hover:text-fg">
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {phase === "error" && (
        <div role="alert" className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-danger">{error}</p>
          {onDismiss && (
            <button type="button" onClick={onDismiss} className="text-muted hover:text-fg">
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
