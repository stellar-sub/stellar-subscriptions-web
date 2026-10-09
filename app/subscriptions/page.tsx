"use client";

import Link from "next/link";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { sortForDisplay } from "@/lib/subscription";
import { CommittedSpend } from "@/components/subscription/CommittedSpend";
import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingBlock } from "@/components/ui/Spinner";
import { RequireWallet } from "@/components/wallet/RequireWallet";

export default function MySubscriptionsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-fg">My subscriptions</h1>
        <p className="max-w-2xl text-sm text-muted">
          Everything you&apos;ve authorized. Pause or cancel any of it here — a cancelled subscription can never be
          charged again.
        </p>
      </header>

      <RequireWallet purpose="see your subscriptions">{(address) => <Subscriptions address={address} />}</RequireWallet>
    </div>
  );
}

function Subscriptions({ address }: { address: string }) {
  const subs = useSubscriptions(address);

  if (subs.error) {
    return <ErrorState error={subs.error} title="Couldn't load your subscriptions" onRetry={subs.reload} />;
  }
  if (!subs.data) return <LoadingBlock label="Loading your subscriptions" />;

  if (subs.data.length === 0) {
    return (
      <EmptyState
        title="No subscriptions yet"
        description="When you subscribe to a plan, it shows up here with your cap, what's been charged, and controls to pause or cancel."
        action={
          <Link href="/plans" className="btn-primary">
            Browse plans
          </Link>
        }
      />
    );
  }

  const ordered = sortForDisplay(subs.data);
  return (
    <div className="space-y-6">
      <CommittedSpend subs={subs.data} />
      <ul className="grid gap-4 lg:grid-cols-2">
        {ordered.map((sub) => (
          <li key={sub.id}>
            <SubscriptionCard sub={sub} onChanged={subs.reload} />
          </li>
        ))}
      </ul>
    </div>
  );
}
