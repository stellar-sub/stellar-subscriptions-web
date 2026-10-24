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
 *
 * Accessibility: the step list is purely visual (aria-hidden) so a screen
 * reader does not re-read every step on each render. A single dedicated live
 * region announces only the current phase once, and the final result. Errors
 * use an assertive live region so they interrupt.
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
  const isError = phase === "error";
  const isSuccess = phase === "success";

  // Announce exactly one message per phase: the active step label while in
  // progress, or the result once finished. Keyed by phase so the live region
  // text changes only when the phase changes (no repeated announcements).
  const announcement = isError
    ? error ?? "Transaction failed"
    : isSuccess
      ? successText
      : current >= 0
        ? steps[current].label
        : "";

  return (
    <div className="rounded-lg border border-line bg-raised/60 p-4 text-sm">
      <div
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {!isSuccess && !isError && (
        <ol className="space-y-2" aria-hidden="true">
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

      {isSuccess && (
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

      {isError && (
        <div className="flex flex-wrap items-start justify-between gap-2">
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
