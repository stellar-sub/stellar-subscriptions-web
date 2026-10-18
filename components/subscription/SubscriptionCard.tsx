"use client";

import Link from "next/link";
import { describeInterval } from "@/lib/format";
import { AddressLink } from "@/components/ui/AddressLink";
import { TokenAmount } from "@/components/ui/TokenAmount";
import type { Subscription } from "@/types";
import { CancelButton } from "./CancelButton";
import { CapProgress } from "./CapProgress";
import { NextChargeCountdown } from "./NextChargeCountdown";
import { PauseResumeButton } from "./PauseResumeButton";
import { SubStatusBadge } from "./SubStatusBadge";

/**
 * One subscription as its subscriber sees it. Pause and cancel sit on the
 * card itself, so stopping a subscription is never more than one click away.
 */
export function SubscriptionCard({ sub, onChanged }: { sub: Subscription; onChanged: () => void }) {
  return (
    <article className="card space-y-5 p-5" aria-label={`Subscription ${sub.id}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-fg">
            <TokenAmount token={sub.token} value={sub.amountPerPeriod} />
            <span className="ml-2 text-sm font-normal text-muted">{describeInterval(sub.intervalLedgers)}</span>
          </h3>
          <p className="text-sm text-muted">
            to <AddressLink address={sub.merchant} />
            {sub.planId > 0 && (
              <>
                {" "}
                ·{" "}
                <Link href={`/plans/${sub.planId}`} className="hover:text-fg hover:underline">
                  plan #{sub.planId}
                </Link>
              </>
            )}
            <span> · subscription #{sub.id}</span>
          </p>
        </div>
        <SubStatusBadge status={sub.status} />
      </header>

      <CapProgress sub={sub} />
      <NextChargeCountdown sub={sub} />

      {/* What happens next explanation based on status */}
      <div className="rounded-lg border border-line bg-raised px-3 py-2 text-sm text-muted">
        {sub.status === "active" && "The merchant can charge once per interval, up to your cap."}
        {sub.status === "paused" && "No charges can happen until you resume."}
        {sub.status === "cancelled" && "Final. No further charges can ever happen."}
        {sub.status === "exhausted" && "The full cap has been charged. No further charges are possible."}
      </div>

      {/* Links to explorer and contract events */}
      <div className="flex flex-wrap gap-2 text-sm">
        <a
          href={`https://stellar.expert/explorer/testnet/contract/${sub.contractId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-link hover:underline"
        >
          View on Explorer ↗
        </a>
        <span className="text-muted">·</span>
        <a
          href={`https://stellar.expert/explorer/testnet/contract/${sub.contractId}/events?search=subscription_${sub.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-link hover:underline"
        >
          View Events ↗
        </a>
      </div>

      <footer className="flex flex-wrap items-start gap-3 border-t border-line pt-4">
        <PauseResumeButton sub={sub} onDone={onChanged} />
        <CancelButton sub={sub} onDone={onChanged} />
      </footer>
    </article>
  );
}
