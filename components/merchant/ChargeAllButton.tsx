'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMerchantSubscriptions } from '@/hooks/useMerchantSubscriptions';
import { useLedger } from '@/hooks/useLedger';
import { useTx } from '@/hooks/useTx';
import { charge } from '@/lib/contract';
import { dueSubscriptions } from '@/lib/subscriptions';
import type { Subscription } from '@/lib/types';

type ChargeResult =
  | { id: string; status: 'charged'; txHash?: string }
  | { id: string; status: 'skipped'; reason: string };

type RunState =
  | { phase: 'idle' }
  | { phase: 'confirming' }
  | { phase: 'running'; current: number; total: number }
  | { phase: 'done'; results: ChargeResult[] };

function formatAmount(amount: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals);
  const whole = amount / base;
  const frac = amount % base;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole.toString()}.${fracStr}`;
}

function isUserDeclined(error: unknown): boolean {
  if (!error) return false;
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : String((error as { message?: unknown }).message ?? '');
  const lower = message.toLowerCase();
  return (
    lower.includes('declined') ||
    lower.includes('rejected') ||
    lower.includes('denied') ||
    lower.includes('user cancel') ||
    lower.includes('cancelled') ||
    lower.includes('canceled')
  );
}

export function ChargeAllButton() {
  const { subscriptions, isLoading: subsLoading } = useMerchantSubscriptions();
  const { ledger, isLoading: ledgerLoading } = useLedger();
  const { run } = useTx();

  const [state, setState] = useState<RunState>({ phase: 'idle' });

  const due = useMemo<Subscription[]>(() => {
    if (!subscriptions || !ledger) return [];
    return dueSubscriptions(subscriptions, ledger);
  }, [subscriptions, ledger]);

  const totalsByToken = useMemo(() => {
    const map = new Map<string, { amount: bigint; decimals: number; symbol: string }>();
    for (const sub of due) {
      const key = sub.token;
      const existing = map.get(key);
      if (existing) {
        existing.amount += sub.amount;
      } else {
        map.set(key, {
          amount: sub.amount,
          decimals: sub.decimals ?? 7,
          symbol: sub.symbol ?? 'TOKEN',
        });
      }
    }
    return Array.from(map.values());
  }, [due]);

  const isLoading = subsLoading || ledgerLoading;
  const isRunning = state.phase === 'running';
  const disabled = isLoading || isRunning || due.length === 0;

  const handleOpenConfirm = useCallback(() => {
    if (disabled) return;
    setState({ phase: 'confirming' });
  }, [disabled]);

  const handleCancel = useCallback(() => {
    if (isRunning) return;
    setState({ phase: 'idle' });
  }, [isRunning]);

  const handleConfirm = useCallback(async () => {
    if (due.length === 0) {
      setState({ phase: 'idle' });
      return;
    }

    const results: ChargeResult[] = [];
    const total = due.length;

    for (let i = 0; i < due.length; i++) {
      const sub = due[i];
      setState({ phase: 'running', current: i + 1, total });

      try {
        const txHash = await run(() => charge(sub, sub.id));
        results.push({ id: sub.id, status: 'charged', txHash });
      } catch (error) {
        if (isUserDeclined(error)) {
          results.push({ id: sub.id, status: 'skipped', reason: 'Signature declined' });
          for (let j = i + 1; j < due.length; j++) {
            results.push({
              id: due[j].id,
              status: 'skipped',
              reason: 'Not attempted (run stopped)',
            });
          }
          setState({ phase: 'done', results });
          return;
        }

        const reason =
          error instanceof Error ? error.message : 'Charge failed';
        results.push({ id: sub.id, status: 'skipped', reason });
      }
    }

    setState({ phase: 'done', results });
  }, [due, run]);

  const handleCloseSummary = useCallback(() => {
    setState({ phase: 'idle' });
  }, []);

  const chargedCount =
    state.phase === 'done'
      ? state.results.filter((r) => r.status === 'charged').length
      : 0;

  return (
    <>
      <button
        type="button"
        onClick={handleOpenConfirm}
        disabled={disabled}
        className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
        aria-busy={isRunning}
      >
        {isRunning
          ? `Charging ${state.current}/${state.total}…`
          : due.length > 0
            ? `Charge all due (${due.length})`
            : 'No due subscriptions'}
      </button>

      {state.phase === 'confirming' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="charge-all-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 id="charge-all-title" className="text-lg font-semibold text-gray-900">
              Charge {due.length} due subscription{due.length === 1 ? '' : 's'}?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You will be asked to sign {due.length} wallet transaction
              {due.length === 1 ? '' : 's'}, one per subscription, processed one at a
              time. Only subscriptions the contract reports as chargeable are
              attempted — each charge is on schedule and within the plan cap. The
              contract forbids charging early, off schedule, or above the cap.
            </p>

            <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Totals by token
              </p>
              <ul className="mt-2 space-y-1">
                {totalsByToken.map((t) => (
                  <li key={t.symbol} className="flex justify-between text-sm text-gray-800">
                    <span>{t.symbol}</span>
                    <span className="font-mono">{formatAmount(t.amount, t.decimals)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Confirm &amp; charge
              </button>
            </div>
          </div>
        </div>
      )}

      {state.phase === 'running' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="charge-all-running-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2
              id="charge-all-running-title"
              className="text-lg font-semibold text-gray-900"
            >
              Charging subscriptions…
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Processing charge {state.current} of {state.total}. Please approve each
              wallet signature. Declining a signature will stop the run and no later
              charges will be sent.
            </p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-indigo-600 transition-all"
                style={{ width: `${(state.current / state.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {state.phase === 'done' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="charge-all-summary-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2
              id="charge-all-summary-title"
              className="text-lg font-semibold text-gray-900"
            >
              Charge run complete
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Charged {chargedCount} of {state.results.length} subscription
              {state.results.length === 1 ? '' : 's'}.
            </p>

            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {state.results.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-gray-200 p-2 text-sm"
                >
                  <span className="font-mono text-xs text-gray-700">{r.id}</span>
                  {r.status === 'charged' ? (
                    <span className="font-medium text-green-700">Charged</span>
                  ) : (
                    <span className="text-right text-xs text-amber-700">
                      Skipped — {r.reason}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleCloseSummary}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChargeAllButton;