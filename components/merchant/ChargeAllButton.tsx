'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMerchantSubscriptions } from '@/hooks/useSubscriptions';
import { useLedger } from '@/hooks/useLedger';
import { useTx } from '@/hooks/useTx';
import { useWallet } from '@/hooks/useWallet';
import { charge } from '@/lib/contracts';
import { dueSubscriptions } from '@/lib/subscription';
import type { Subscription } from '@/types';

type ChargeResult =
  | { id: number; status: 'charged'; txHash?: string }
  | { id: number; status: 'skipped'; reason: string };

type RunState =
  | { phase: 'idle' }
  | { phase: 'confirming' }
  | { phase: 'running'; current: number; total: number }
  | { phase: 'done'; results: ChargeResult[] };

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
  const { network } = useWallet();
  const { sequence } = useLedger(network);
  const { data: subscriptions } = useMerchantSubscriptions(null);
  const { run } = useTx();

  const [state, setState] = useState<RunState>({ phase: 'idle' });

  const due = useMemo<Subscription[]>(() => {
    if (!subscriptions || sequence === null) return [];
    return dueSubscriptions(subscriptions as Subscription[], sequence, () => true);
  }, [subscriptions, sequence]);

  const disabled = state.phase === 'running' || due.length === 0;

  const handleOpenConfirm = useCallback(() => {
    if (disabled) return;
    setState({ phase: 'confirming' });
  }, [disabled]);

  const handleCancel = useCallback(() => {
    if (state.phase === 'running') return;
    setState({ phase: 'idle' });
  }, [state.phase]);

  const handleConfirm = useCallback(async () => {
    if (due.length === 0) { setState({ phase: 'idle' }); return; }
    const results: ChargeResult[] = [];
    const total = due.length;

    for (let i = 0; i < due.length; i++) {
      const sub = due[i];
      setState({ phase: 'running', current: i + 1, total });
      try {
        const result = await run((ctx) => charge(ctx, sub.id));
        results.push({ id: sub.id, status: 'charged', txHash: (result as { hash?: string })?.hash });
      } catch (error) {
        if (isUserDeclined(error)) {
          results.push({ id: sub.id, status: 'skipped', reason: 'Signature declined' });
          for (let j = i + 1; j < due.length; j++) {
            results.push({ id: due[j].id, status: 'skipped', reason: 'Not attempted' });
          }
          setState({ phase: 'done', results });
          return;
        }
        results.push({ id: sub.id, status: 'skipped', reason: error instanceof Error ? error.message : 'Charge failed' });
      }
    }
    setState({ phase: 'done', results });
  }, [due, run]);

  const handleClose = useCallback(() => setState({ phase: 'idle' }), []);

  const chargedCount = state.phase === 'done' ? state.results.filter((r) => r.status === 'charged').length : 0;

  return (
    <>
      <button
        type="button"
        onClick={handleOpenConfirm}
        disabled={disabled}
        className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        aria-busy={state.phase === 'running'}
      >
        {state.phase === 'running'
          ? `Charging ${state.current}/${state.total}…`
          : due.length > 0
            ? `Charge all due (${due.length})`
            : 'No due subscriptions'}
      </button>

      {state.phase === 'confirming' && (
        <div role="dialog" aria-modal="true" aria-labelledby="charge-all-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl">
            <h2 id="charge-all-title" className="font-semibold text-fg">Charge {due.length} subscription{due.length === 1 ? '' : 's'}?</h2>
            <p className="mt-2 text-sm text-muted">You will sign one wallet transaction per subscription. The contract refuses any charge that is early, off-schedule, or above the cap.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={handleCancel} className="btn-secondary">Cancel</button>
              <button type="button" onClick={handleConfirm} className="btn-primary">Confirm &amp; charge</button>
            </div>
          </div>
        </div>
      )}

      {state.phase === 'done' && (
        <div role="dialog" aria-modal="true" aria-labelledby="charge-all-summary" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl">
            <h2 id="charge-all-summary" className="font-semibold text-fg">Run complete — {chargedCount}/{state.results.length} charged</h2>
            <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto text-sm">
              {state.results.map((r) => (
                <li key={r.id} className="flex justify-between gap-3 rounded border border-line p-2">
                  <span className="font-mono text-xs text-muted">#{r.id}</span>
                  {r.status === 'charged' ? <span className="text-ok-strong">Charged</span> : <span className="text-warn-strong">Skipped — {r.reason}</span>}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={handleClose} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChargeAllButton;
