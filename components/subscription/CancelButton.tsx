"use client";

import { useEffect, useRef, useState } from "react";
import { useTx } from "@/hooks/useTx";
import { useWallet } from "@/hooks/useWallet";
import { cancelSubscription } from "@/lib/contracts";
import { TokenAmount } from "@/components/ui/TokenAmount";
import { TxProgress } from "@/components/ui/TxProgress";
import { SubStatus, type Subscription } from "@/types";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Cancel a subscription. One click opens a confirmation that says plainly
 * what cancelling means; a second click signs it in Freighter. Always visible
 * on a live subscription, never behind a menu.
 */
export function CancelButton({ sub, onDone }: { sub: Subscription; onDone: () => void }) {
  const { network } = useWallet();
  const tx = useTx();
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const live = sub.status === SubStatus.Active || sub.status === SubStatus.Paused;

  // Move focus into the dialog on open, trap it while open, and restore it to
  // the trigger on close. Escape dismisses without cancelling.
  useEffect(() => {
    if (!confirming) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    const first = focusables()[0];
    (first ?? dialog).focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setConfirming(false);
        tx.reset();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        dialog!.focus();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === firstEl || !dialog!.contains(active)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else if (active === lastEl || !dialog!.contains(active)) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [confirming, tx]);

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
      <button
        ref={triggerRef}
        type="button"
        className="btn-danger"
        aria-haspopup="dialog"
        aria-expanded={confirming}
        onClick={() => setConfirming(true)}
      >
        Cancel subscription
      </button>
    );
  }

  return (
    <div
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`cancel-${sub.id}`}
      aria-describedby={`cancel-${sub.id}-desc`}
      tabIndex={-1}
      className="w-full space-y-3 rounded-lg border border-danger/40 bg-danger/5 p-4"
    >
      <h4 id={`cancel-${sub.id}`} className="font-semibold text-fg">
        Cancel subscription #{sub.id}?
      </h4>
      <p id={`cancel-${sub.id}-desc`} className="text-sm text-fg">
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
