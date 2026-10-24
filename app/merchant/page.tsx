'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RequireWallet } from '@/components/RequireWallet';
import { EmptyState } from '@/components/EmptyState';
import { useWallet } from '@/hooks/useWallet';
import { useMerchantPlans } from '@/hooks/useMerchantPlans';
import { useToken } from '@/hooks/useToken';
import { getTokenBalance } from '@/lib/token';

const SHARE_FLAG_KEY = 'merchant:hasSharedPlanLink';

type ChecklistItem = {
  key: string;
  title: string;
  description: string;
  done: boolean;
  action?: { label: string; href?: string; onClick?: () => void };
};

export default function MerchantDashboardPage() {
  const { address, connect, isConnecting } = useWallet();
  const { plans, isLoading: plansLoading, error: plansError } = useMerchantPlans(address);
  const { token } = useToken();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [hasShared, setHasShared] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setHasShared(window.localStorage.getItem(SHARE_FLAG_KEY) === 'true');
    } catch {
      setHasShared(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!address || !token) {
      setBalance(null);
      return;
    }
    setBalanceLoading(true);
    getTokenBalance(token, address)
      .then((value) => {
        if (!cancelled) setBalance(value);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      })
      .finally(() => {
        if (!cancelled) setBalanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [address, token]);

  const hasPlans = plans.length > 0;
  const isFunded = balance !== null && balance > BigInt(0);

  const markShared = () => {
    setHasShared(true);
    try {
      window.localStorage.setItem(SHARE_FLAG_KEY, 'true');
    } catch {
      // ignore storage failures
    }
  };

  const checklist = useMemo<ChecklistItem[]>(() => {
    return [
      {
        key: 'connect',
        title: 'Connect your wallet',
        description: 'Connect the wallet you will use to receive payments.',
        done: Boolean(address),
        action: address
          ? undefined
          : { label: isConnecting ? 'Connecting…' : 'Connect wallet', onClick: connect },
      },
      {
        key: 'fund',
        title: 'Fund your account',
        description: 'Add the native token to your wallet so you can create a plan.',
        done: isFunded,
        action:
          address && !isFunded
            ? { label: balanceLoading ? 'Checking balance…' : 'Fund account', href: '/merchant/fund' }
            : undefined,
      },
      {
        key: 'plan',
        title: 'Create a plan',
        description: 'Set a price and billing interval. Charges never exceed the cap or run off schedule.',
        done: hasPlans,
        action: hasPlans ? undefined : { label: 'Create a plan', href: '/merchant/plans/new' },
      },
      {
        key: 'share',
        title: 'Share your plan link',
        description: 'Send the public link to your customers so they can subscribe.',
        done: hasShared,
        action:
          hasPlans && !hasShared
            ? { label: 'Copy plan link', onClick: markShared }
            : undefined,
      },
    ];
  }, [address, isConnecting, connect, isFunded, balanceLoading, hasPlans, hasShared]);

  const showChecklist = !hasPlans;

  return (
    <RequireWallet>
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Merchant dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your subscription plans and share them with customers.
            </p>
          </div>
          <Link
            href="/merchant/plans/new"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create a plan
          </Link>
        </header>

        {showChecklist && (
          <section
            aria-labelledby="onboarding-heading"
            className="mb-8 rounded-lg border border-gray-200 bg-white p-6"
          >
            <h2 id="onboarding-heading" className="text-lg font-semibold">
              Get started
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Complete these steps to start accepting subscriptions.
            </p>
            <ol className="mt-4 space-y-4">
              {checklist.map((item) => (
                <li key={item.key} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-semibold ${
                      item.done
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item.done ? '✓' : '•'}
                  </span>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        item.done ? 'text-gray-500 line-through' : 'text-gray-900'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  {!item.done && item.action && (
                    <div className="flex-none">
                      {item.action.href ? (
                        <Link
                          href={item.action.href}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {item.action.label}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={item.action.onClick}
                          disabled={item.key === 'connect' && isConnecting}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                        >
                          {item.action.label}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-labelledby="plans-heading">
          <h2 id="plans-heading" className="mb-4 text-lg font-semibold">
            Your plans
          </h2>

          {plansLoading && <p className="text-sm text-gray-600">Loading plans…</p>}

          {!plansLoading && plansError && (
            <p className="text-sm text-red-600">Could not load plans. Please try again.</p>
          )}

          {!plansLoading && !plansError && !hasPlans && (
            <EmptyState
              title="No plans yet"
              description="Create your first plan to start accepting subscriptions. Charges never exceed the cap or run off schedule."
              action={
                <Link
                  href="/merchant/plans/new"
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Create a plan
                </Link>
              }
            />
          )}

          {!plansLoading && !plansError && hasPlans && (
            <ul className="space-y-3">
              {plans.map((plan) => (
                <li
                  key={plan.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">Plan #{plan.id}</p>
                    <p className="text-sm text-gray-600">
                      {plan.amount} {token?.symbol ?? ''} every {plan.interval}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/plans/${plan.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      View public page
                    </Link>
                    <button
                      type="button"
                      onClick={markShared}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      Copy link
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </RequireWallet>
  );
}