'use client';

import { useCallback, useMemo, useState } from 'react';
import { charge, ContractError, type Subscription } from '@/lib/contracts';

type RowOutcome =
  | { status: 'charged'; hash: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

type RowResult = {
  subscriptionId: string;
  subscriber: string;
  outcome: RowOutcome;
};

type ChargeAllButtonProps = {
  subscriptions: Subscription[];
  onReload?: () => void | Promise<void>;
  className?: string;
};

function describeSkipReason(subscription: Subscription): string {
  if (subscription.status === 'paused') return 'Paused';
  if (subscription.status === 'cancelled') return 'Cancelled';
  if (!subscription.is_due) return 'Not due yet';
  if (subscription.cap_reached) return 'Cap reached';
  return 'Not chargeable';
}

function isChargeable(subscription: Subscription): boolean {
  return (
    subscription.status === 'active' &&
    subscription.is_due &&
    !subscription.cap_reached
  );
}

export default function ChargeAllButton({
  subscriptions,
  onReload,
  className,
}: ChargeAllButtonProps) {
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const failedIds = useMemo(() => {
    if (!results) return new Set<string>();
    return new Set(
      results
        .filter((r) => r.outcome.status === 'failed')
        .map((r) => r.subscriptionId),
    );
  }, [results]);

  const runCharges = useCallback(
    async (targets: Subscription[], mode: 'initial' | 'retry') => {
      if (mode === 'initial') {
        setIsRunning(true);
      } else {
        setIsRetrying(true);
      }

      const collected: RowResult[] = [];

      for (const subscription of targets) {
        if (!isChargeable(subscription)) {
          collected.push({
            subscriptionId: subscription.id,
            subscriber: subscription.subscriber,
            outcome: { status: 'skipped', reason: describeSkipReason(subscription) },
          });
          continue;
        }

        try {
          const { hash } = await charge(subscription.id);
          collected.push({
            subscriptionId: subscription.id,
            subscriber: subscription.subscriber,
            outcome: { status: 'charged', hash },
          });
        } catch (error) {
          const reason =
            error instanceof ContractError
              ? error.message
              : error instanceof Error
                ? error.message
                : 'Unknown error';
          collected.push({
            subscriptionId: subscription.id,
            subscriber: subscription.subscriber,
            outcome: { status: 'failed', reason },
          });
        }
      }

      if (mode === 'initial') {
        setResults(collected);
        setIsRunning(false);
      } else {
        setResults((prev) => {
          if (!prev) return collected;
          const byId = new Map(collected.map((r) => [r.subscriptionId, r]));
          return prev.map((r) => byId.get(r.subscriptionId) ?? r);
        });
        setIsRetrying(false);
      }

      if (onReload) {
        try {
          await onReload();
        } catch {
          // Reload failures should not hide the per-row results.
        }
      }
    },
    [onReload],
  );

  const handleChargeAll = useCallback(() => {
    if (isRunning || isRetrying) return;
    void runCharges(subscriptions, 'initial');
  }, [isRunning, isRetrying, runCharges, subscriptions]);

  const handleRetryFailed = useCallback(() => {
    if (isRunning || isRetrying || !results) return;
    const targets = subscriptions.filter((s) => failedIds.has(s.id));
    if (targets.length === 0) return;
    void runCharges(targets, 'retry');
  }, [isRunning, isRetrying, results, subscriptions, failedIds, runCharges]);

  const handleDismiss = useCallback(() => {
    if (isRunning || isRetrying) return;
    setResults(null);
  }, [isRunning, isRetrying]);

  const busy = isRunning || isRetrying;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleChargeAll}
          disabled={busy || subscriptions.length === 0}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRunning ? 'Charging…' : 'Charge all'}
        </button>

        {results && failedIds.size > 0 && (
          <button
            type="button"
            onClick={handleRetryFailed}
            disabled={busy}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRetrying ? 'Retrying…' : `Retry failed (${failedIds.size})`}
          </button>
        )}

        {results && (
          <button
            type="button"
            onClick={handleDismiss}
            disabled={busy}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Dismiss results
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Charges run sequentially. Only subscriptions that are active, due, and under
        their cap will be charged. Nothing is charged off schedule or above the cap.
      </p>

      {results && (
        <ul className="mt-4 divide-y divide-gray-200 rounded-md border border-gray-200">
          {results.map((row) => (
            <li
              key={row.subscriptionId}
              className="flex items-start justify-between gap-4 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-gray-700">
                  {row.subscriber}
                </p>
                <p className="text-xs text-gray-500">
                  Subscription {row.subscriptionId}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {row.outcome.status === 'charged' && (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Charged
                  </span>
                )}
                {row.outcome.status === 'skipped' && (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    Skipped — {row.outcome.reason}
                  </span>
                )}
                {row.outcome.status === 'failed' && (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    Failed — {row.outcome.reason}
                  </span>
                )}
                {row.outcome.status === 'charged' && (
                  <p className="mt-1 truncate font-mono text-[10px] text-gray-400">
                    {row.outcome.hash}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}