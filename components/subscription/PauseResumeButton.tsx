"use client";

import { useTx } from "@/hooks/useTx";
import { useWallet } from "@/hooks/useWallet";
import { pauseSubscription, resumeSubscription } from "@/lib/contracts";
import { TxProgress } from "@/components/ui/TxProgress";
import { SubStatus, type Subscription } from "@/types";

/** Pause an active subscription, or resume a paused one. One click, one signature. */
export function PauseResumeButton({ sub, onDone }: { sub: Subscription; onDone: () => void }) {
  const { network } = useWallet();
  const tx = useTx();

  const paused = sub.status === SubStatus.Paused;
  if (sub.status !== SubStatus.Active && !paused) return null;

  async function toggle() {
    const result = await tx.run((ctx) => (paused ? resumeSubscription : pauseSubscription)(ctx, sub.id));
    if (result) onDone();
  }

  return (
    <div className="space-y-2">
      <button type="button" className="btn-secondary" onClick={() => void toggle()} disabled={tx.pending}>
        {tx.pending ? (paused ? "Resuming…" : "Pausing…") : paused ? "Resume" : "Pause"}
      </button>
      {!paused && tx.phase === "idle" && (
        <p className="text-xs text-muted">Pausing stops charges until you resume. You can still cancel.</p>
      )}
      {paused && tx.phase === "idle" && (
        <p className="text-xs text-muted">
          If a charge fell due while paused, the merchant can make one right after you resume. Missed periods
          aren&apos;t billed in a burst.
        </p>
      )}
      <TxProgress
        phase={tx.phase}
        hash={tx.hash}
        error={tx.error}
        network={network}
        successText={paused ? "Resumed." : "Paused. No charges until you resume."}
        onDismiss={tx.reset}
      />
    </div>
  );
}
