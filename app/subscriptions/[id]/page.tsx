"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscriptions";
import { describeInterval } from "@/lib/format";
import { AddressLink } from "@/components/ui/AddressLink";
import { TokenAmount } from "@/components/ui/TokenAmount";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingBlock } from "@/components/ui/Spinner";
import { CapProgress } from "@/components/subscription/CapProgress";
import { NextChargeCountdown } from "@/components/subscription/NextChargeCountdown";
import { PauseResumeButton } from "@/components/subscription/PauseResumeButton";
import { CancelButton } from "@/components/subscription/CancelButton";
import { SubStatusBadge } from "@/components/subscription/SubStatusBadge";
import { ChargeHistory } from "@/components/subscription/ChargeHistory";

export default function SubscriptionDetailPage() {
  const params = useParams();
  const id = params.id ? parseInt(params.id as string) : null;
  const sub = useSubscription(id);

  if (sub.error) {
    return (
      <div className="space-y-6">
        <ErrorState error={sub.error} title="Couldn't load subscription" onRetry={sub.reload} />
        <Link href="/subscriptions" className="btn-secondary">
          Back to subscriptions
        </Link>
      </div>
    );
  }

  if (!sub.data) {
    return <LoadingBlock label="Loading subscription details" />;
  }

  const subscription = sub.data;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-fg">Subscription #{subscription.id}</h1>
            <p className="mt-1 text-sm text-muted">
              <TokenAmount token={subscription.token} value={subscription.amountPerPeriod} />
              {" every "}
              {describeInterval(subscription.intervalLedgers)}
            </p>
          </div>
          <SubStatusBadge status={subscription.status} />
        </div>
      </header>

      <section className="space-y-4 rounded border border-line p-6">
        <h2 className="text-lg font-semibold text-fg">Subscription terms</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted">Merchant</p>
            <p className="font-medium text-fg">
              <AddressLink address={subscription.merchant} />
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Billing frequency</p>
            <p className="font-medium text-fg">{describeInterval(subscription.intervalLedgers)}</p>
          </div>
          <div>
            <p className="text-sm text-muted">Amount per period</p>
            <p className="font-medium text-fg">
              <TokenAmount token={subscription.token} value={subscription.amountPerPeriod} />
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Total cap</p>
            <p className="font-medium text-fg">
              <TokenAmount token={subscription.token} value={subscription.totalCap} />
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Total charged</p>
            <p className="font-medium text-fg">
              <TokenAmount token={subscription.token} value={subscription.totalCharged} />
            </p>
          </div>
          {subscription.planId > 0 && (
            <div>
              <p className="text-sm text-muted">Plan</p>
              <p className="font-medium text-fg">
                <Link href={`/plans/${subscription.planId}`} className="text-brand hover:underline">
                  Plan #{subscription.planId}
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <CapProgress sub={subscription} />
        <NextChargeCountdown sub={subscription} />
      </section>

      <ChargeHistory subscriptionId={subscription.id} token={subscription.token} />

      <footer className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <PauseResumeButton sub={subscription} onDone={sub.reload} />
        <CancelButton sub={subscription} onDone={sub.reload} />
        <Link href="/subscriptions" className="ml-auto text-sm text-brand hover:underline">
          Back to subscriptions
        </Link>
      </footer>
    </div>
  );
}
