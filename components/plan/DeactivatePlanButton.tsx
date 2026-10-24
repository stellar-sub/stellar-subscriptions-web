'use client';

import { useState } from 'react';
import { useTx } from '@/lib/useTx';
import { deactivatePlan } from '@/lib/contracts';
import { TxProgress } from '@/components/TxProgress';

interface DeactivatePlanButtonProps {
  planId: string | number;
  onDeactivated?: () => void;
}

export function DeactivatePlanButton({
  planId,
  onDeactivated,
}: DeactivatePlanButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { run, status, error, reset } = useTx();

  const handleConfirm = async () => {
    try {
      await run(() => deactivatePlan(planId));
      setIsOpen(false);
      onDeactivated?.();
    } catch {
      // Error surfaced via TxProgress
    }
  };

  const handleClose = () => {
    if (status === 'pending') return;
    setIsOpen(false);
    reset();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
      >
        Deactivate plan
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-plan-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2
              id="deactivate-plan-title"
              className="text-lg font-semibold text-gray-900"
            >
              Deactivate this plan?
            </h2>

            <div className="mt-3 space-y-3 text-sm text-gray-700">
              <p>
                Deactivating this plan stops <strong>new</strong> subscribers
                from joining. It does not change existing subscriptions:
                current subscribers keep being charged as they authorized.
              </p>
              <p className="font-medium text-red-700">
                This cannot be undone.
              </p>
            </div>

            <div className="mt-4">
              <TxProgress status={status} error={error} />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={status === 'pending'}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={status === 'pending'}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {status === 'pending' ? 'Deactivating…' : 'Deactivate plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}