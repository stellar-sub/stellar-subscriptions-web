"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("SubscriptionCard");

  return (
    <article className="card space-y-5 p-5" aria-label={t("ariaLabel", { id: sub.id })}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-fg">
            <TokenAmount token={sub.token} value={sub.amountPerPeriod} />
            <span className="ml-2 text-sm font-normal text-muted">{describeInterval(sub.intervalLedgers)}</span>
          </h3>
          <p className="text-sm text-muted">
            {t("to")} <AddressLink address={sub.merchant} />
            {sub.planId > 0 && (
              <>
                {" "}
                ·{" "}
                <Link href={`/plans/${sub.planId}`} className="hover:text-fg hover:underline">
                  {t("plan", { id: sub.planId })}
                </Link>
              </>
            )}
            <span> · {t("subscription", { id: sub.id })}</span>
          </p>
        </div>
        <SubStatusBadge status={sub.status} />
      </header>

      <CapProgress sub={sub} />
      <NextChargeCountdown sub={sub} />

      <footer className="flex flex-wrap items-start gap-3 border-t border-line pt-4">
        <PauseResumeButton sub={sub} onDone={onChanged} />
        <CancelButton sub={sub} onDone={onChanged} />
      </footer>
    </article>
  );
}

/**
 * Card-shaped placeholder shown while subscriptions load. Mirrors the layout
 * and spacing of {@link SubscriptionCard} so the grid does not shift when the
 * real data arrives. Labelled for assistive technology.
 */
export function SubscriptionCardSkeleton() {
  return (
    <article
      className="card space-y-5 p-5"
      role="status"
      aria-busy="true"
      aria-label="Loading subscription"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="h-6 w-40 animate-pulse rounded bg-line" />
          <div className="h-4 w-56 animate-pulse rounded bg-line" />
        </div>
        <div className="h-6 w-20 animate-pulse rounded-full bg-line" />
      </header>

      <div className="space-y-2">
        <div className="h-2 w-full animate-pulse rounded-full bg-line" />
        <div className="h-4 w-32 animate-pulse rounded bg-line" />
      </div>

      <div className="h-4 w-48 animate-pulse rounded bg-line" />

      <footer className="flex flex-wrap items-start gap-3 border-t border-line pt-4">
        <div className="h-9 w-24 animate-pulse rounded bg-line" />
        <div className="h-9 w-24 animate-pulse rounded bg-line" />
      </footer>
    </article>
  );
}
