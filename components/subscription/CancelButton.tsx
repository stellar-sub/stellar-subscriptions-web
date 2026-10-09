"use client";

import { useState } from "react";
import { useTx } from "@/hooks/useTx";
import { useWallet } from "@/hooks/useWallet";
import { cancelSubscription } from "@/lib/contracts";
import { TokenAmount } from "@/components/ui/TokenAmount";
import { TxProgress } from "@/components/ui/TxProgress";
import { SubStatus, type Subscription } from "@/types";

/**
 * Cancel a subscription. One click opens a confirmation that says plainly
 * what cancelling means; a second click signs it in Freighter. Always visible
 * on a live subscription, never behind a menu.
 */
export function CancelButton({ sub, onDone }: { sub: Subscription; onDone: () => void }) {
  const { network } = useWallet();
  const tx = useTx();
  const [confirming, setConfirming] = useState(false);

  const live = sub.status === SubStatus.Active || sub.status === SubStatus.Paused;
  if (!live && tx.phase !== "success") return null;

  async function cancel() {
    const result = await tx.run((ctx) => cancelSubscription(ctx, sub.id));
    if (result) {
      setConfirming(false);
      onDone();
    }
  }

  if (tx.phase === "success") {
    return (
      <TxProgress
        phase={tx.phase}
        hash={tx.hash}
        error={null}
        network={network}
        successText="Cancelled. No further charges can occur."
        onDismiss={tx.reset}
      />
    );
  }

  if (!confirming) {
    return (
      <button type="button" className="btn-danger" onClick={() => setConfirming(true)}>
        Cancel subscription
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-labelledby={`cancel-${sub.id}`} className="w-full space-y-3 rounded-lg border border-danger/40 bg-danger/5 p-4">
      <h4 id={`cancel-${sub.id}`} className="font-semibold text-fg">
        Cancel subscription #{sub.id}?
      </h4>
      <p className="text-sm text-fg">
        <strong>After you cancel, no further charges can occur.</strong> Not now, not later, not by the merchant,
        not by anyone. This is final and can&apos;t be undone — to subscribe again you would start a new
        subscription.
      </p>
      <p className="text-sm text-muted">
        You&apos;ve been charged <TokenAmount token={sub.token} value={sub.totalCharged} /> so far. Cancelling
        doesn&apos;t refund that, and costs a small network fee.
      </p>

      <TxProgress phase={tx.phase} hash={tx.hash} error={tx.error} network={network} successText="" onDismiss={tx.reset} />

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-danger" onClick={() => void cancel()} disabled={tx.pending}>
          {tx.pending ? "Cancelling…" : "Yes, cancel for good"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={tx.pending}
          onClick={() => {
            setConfirming(false);
            tx.reset();
          }}
        >
          Keep subscription
        </button>
      </div>
    </div>
  );
}
