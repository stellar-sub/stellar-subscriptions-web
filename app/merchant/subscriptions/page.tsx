'use client';

import { useCallback } from 'react';
import RequireWallet from '@/components/wallet/RequireWallet';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import SubscriberTable from '@/components/merchant/SubscriberTable';
import ChargeAllButton from '@/components/merchant/ChargeAllButton';
import { useMerchantSubscriptions } from '@/hooks/useSubscriptions';

function MerchantSubscriptionsContent({ address }: { address: string }) {
  const { subscriptions, loading, error, reload } = useMerchantSubscriptions(address);

  const handleReload = useCallback(() => {
    reload();
  }, [reload]);

  if (loading) {
    return <div className="p-8 text-center text-muted">Loading your subscribers…</div>;
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load subscribers"
        message={error}
        onRetry={handleReload}
      />
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <EmptyState
        title="No subscribers yet"
        description="When someone subscribes to one of your plans they will appear here. You can only charge within the cap and schedule they authorized."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your subscribers</h2>
        <ChargeAllButton subscriptions={subscriptions} onCharged={handleReload} />
      </div>
      <p className="text-sm text-gray-600">
        Charges are limited to the cap and schedule each subscriber authorized. You cannot charge
        more than the cap or off schedule.
      </p>
      <SubscriberTable subscriptions={subscriptions} onChanged={handleReload} />
    </div>
  );
}

export default function MerchantSubscriptionsPage() {
  return (
    <RequireWallet purpose="see your subscribers and charge them">
      {({ address }) => <MerchantSubscriptionsContent address={address} />}
    </RequireWallet>
  );
}