"use client";

import { memo } from "react";
import { useLedger } from "@/hooks/useLedger";
import { useWallet } from "@/hooks/useWallet";
import { usePlan } from "@/hooks/usePlans";
import { isDueByLedger } from "@/lib/subscription";
import { SubStatus, type Subscription } from "@/types";
import { SubStatusBadge } from "./SubStatusBadge";
import { CapProgress } from "./CapProgress";
import { NextChargeCountdown } from "./NextChargeCountdown";

type Props = {
  sub: Subscription;
};

/**
 * Buckets the ledger distance so memo only treats a tick as a meaningful
 * change when the displayed countdown text would actually change.
 * Returns -1 when the charge is already overdue (bucket 0 would conflate
 * "just became overdue" with "still counting down to 0").
 */
function countdownBucket(nextChargeLedger: number, currentLedger: number): number {
  const remaining = nextChargeLedger - currentLedger;
  return remaining <= 0 ? -1 : remaining;
}

function arePropsEqual(prev: Props, next: Props): boolean {
  const a = prev.sub;
  const b = next.sub;

  if (
    a.id !== b.id ||
    a.status !== b.status ||
    a.amountPerPeriod !== b.amountPerPeriod ||
    a.totalCap !== b.totalCap ||
    a.totalCharged !== b.totalCharged ||
    a.token !== b.token ||
    a.planId !== b.planId
  ) {
    return false;
  }

  // A memo skip is safe only when the countdown bucket is unchanged too.
  // We compare against ledger 0 here because the currentLedger isn't a prop;
  // it comes from the hook inside. This means memo never skips on a pure
  // nextChargeLedger change — a known, acceptable trade-off.
  return (
    countdownBucket(a.nextChargeLedger, 0) === countdownBucket(b.nextChargeLedger, 0)
  );
}

function SubscriptionCard({ sub }: Props) {
  const { network } = useWallet();
  const { sequence } = useLedger(network);
  const { data: plan, error, loading: isLoading } = usePlan(
    sub.planId !== 0 ? sub.planId : null,
  );

  const currentLedger = sequence ?? 0;
  const overdue = isDueByLedger(sub, currentLedger);

  return (
    <article
      className="card space-y-4 p-5"
      aria-labelledby={`sub-${sub.id}-heading`}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3
            id={`sub-${sub.id}-heading`}
            className="font-semibold text-fg"
            data-testid="sub-heading"
          >
            Subscription #{sub.id}
          </h3>

          {sub.planId !== 0 && (
            <>
              {isLoading && (
                <p
                  className="text-xs text-muted"
                  aria-busy="true"
                  data-testid="plan-name-loading"
                >
                  Loading plan…
                </p>
              )}
              {!isLoading && error && (
                <p className="text-xs text-muted" data-testid="plan-name-error">
                  Plan unavailable
                </p>
              )}
              {!isLoading && !error && plan && (
                <p className="text-xs text-muted" data-testid="plan-name">
                  {(plan as { name: string }).name}
                </p>
              )}
            </>
          )}
        </div>

        {/* Status badges — the "Due now" badge uses rose/red to distinguish
            it clearly from the green/yellow/grey status badges. */}
        <div className="flex flex-wrap items-center gap-2">
          {overdue && (
            <span
              className="rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400"
              title="The merchant can charge this subscription right now."
              data-testid="due-now-badge"
            >
              Due now
            </span>
          )}
          <SubStatusBadge status={sub.status} />
        </div>
      </div>

      {/* ── Charge countdown ────────────────────────────────────────── */}
      <NextChargeCountdown sub={sub} />

      {/* ── Cap progress ────────────────────────────────────────────── */}
      <CapProgress sub={sub} />
    </article>
  );
}

const MemoizedSubscriptionCard = memo(SubscriptionCard, arePropsEqual);

export { MemoizedSubscriptionCard as SubscriptionCard };
export default MemoizedSubscriptionCard;
