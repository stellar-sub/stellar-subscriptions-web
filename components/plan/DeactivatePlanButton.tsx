"use client";

import { useState } from "react";
import { useTx } from "@/hooks/useTx";
import { useWallet } from "@/hooks/useWallet";
import { deactivatePlan } from "@/lib/contracts";
import { TxProgress } from "@/components/ui/TxProgress";

interface DeactivatePlanButtonProps {
  planId: number;
  /** Plan name, used to give the trigger button an accessible label. */
  planName: string;
  onDeactivated?: () => void;
}

export function DeactivatePlanButton({ planId, planName, onDeactivated }: DeactivatePlanButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { network } = useWallet();
  const { run, phase, hash, error, pending, reset } = useTx();

  const handleConfirm = async () => {
    // run() resolves to null on failure; the error is surfaced via TxProgress
    const result = await run((ctx) => deactivatePlan(ctx, planId));
    if (result) {
      setIsOpen(false);
      onDeactivated?.();
    }
  };

  const handleClose = () => {
    if (pending) return;
    setIsOpen(false);
    reset();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Deactivate plan ${planName}`}
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
            <h2 id="deactivate-plan-title" className="text-lg font-semibold text-gray-900">
              Deactivate this plan?
            </h2>

            <div className="mt-3 space-y-3 text-sm text-gray-700">
              <p>
                Deactivating this plan stops <strong>new</strong> subscribers from joining. It does not change existing
                subscriptions: current subscribers keep being charged as they authorized.
              </p>
              <p className="font-medium text-red-700">This cannot be undone.</p>
            </div>

            <div className="mt-4">
              <TxProgress phase={phase} hash={hash} error={error} network={network} successText="Plan deactivated." />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={pending}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Deactivating…" : "Deactivate plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
