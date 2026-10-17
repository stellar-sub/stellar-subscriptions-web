'use client';

import Link from 'next/link';
import { RequireWallet } from '@/components/RequireWallet';
import { useMerchantPlans } from '@/hooks/usePlans';
import { useMerchantSubscriptions } from '@/hooks/useSubscriptions';
import { SubStatus } from '@/lib/contract';
import { LoadingBlock } from '@/components/LoadingBlock';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

function MerchantDashboard({ address }: { address: string }) {
  const plans = useMerchantPlans(address);
  const subscriptions = useMerchantSubscriptions(address);

  const isLoading = plans.isLoading || subscriptions.isLoading;
  const error = plans.error ?? subscriptions.error;
  const retry = () => {
    if (plans.error) plans.retry();
    if (subscriptions.error) subscriptions.retry();
  };

  const planList = plans.data ?? [];
  const subscriptionList = subscriptions.data ?? [];

  const totalPlans = planList.length;
  const activePlans = planList.filter((plan) => plan.active).length;
  const totalSubscriptions = subscriptionList.length;
  const activeSubscriptions = subscriptionList.filter(
    (subscription) => subscription.status === SubStatus.Active,
  ).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchant dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            An overview of your plans and subscribers. Charges are always capped by
            each plan&apos;s limit and only occur on the schedule you set — the
            contract enforces this.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/merchant/plans/new"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Create a plan
          </Link>
          <Link
            href="/merchant/subscribers"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View subscribers
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8">
          <LoadingBlock label="Loading your dashboard…" />
        </div>
      ) : error ? (
        <div className="mt-8">
          <ErrorState
            title="Could not load your dashboard"
            message={
              error instanceof Error
                ? error.message
                : 'Something went wrong while loading your plans and subscriptions.'
            }
            onRetry={retry}
          />
        </div>
      ) : totalPlans === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No plans yet"
            description="Create your first plan to start accepting subscribers. You set the cap and schedule; the contract never charges beyond them."
            actionLabel="Create a plan"
            actionHref="/merchant/plans/new"
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total plans" value={totalPlans} />
          <StatCard label="Active plans" value={activePlans} />
          <StatCard label="Total subscriptions" value={totalSubscriptions} />
          <StatCard label="Active subscriptions" value={activeSubscriptions} />
        </div>
      )}
    </div>
  );
}

export default function MerchantPage() {
  return (
    <RequireWallet purpose="see your merchant dashboard">
      {({ address }) => <MerchantDashboard address={address} />}
    </RequireWallet>
  );
}