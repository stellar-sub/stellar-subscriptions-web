'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTx } from '@/hooks/useTx';
import { useLedger } from '@/hooks/useLedger';
import { charge } from '@/lib/contracts';
import { ContractError } from '@/lib/errors';
import type { Subscription } from '@/lib/types';
import { TxProgress } from '@/components/tx/TxProgress';

export interface ChargeButtonProps {
  subscription: Subscription;
  onCharged?: (subscription: Subscription) => void;
  disabledReason?: string;
  className?: string;
}

function formatAmount(value: bigint | number | string): string {
  try {
    return BigInt(value).toString();
  } catch {
    return String(value);
  }
}

export function ChargeButton({
  subscription,
  onCharged,
  disabledReason,
  className,
}: ChargeButtonProps) {
  const { run, status, error, reset } = useTx();
  const { ledger } = useLedger();
  const [refusal, setRefusal] = useState<string | null>(null);

  const notDueReason = useMemo<string | null>(() => {
    if (disabledReason) return disabledReason;
    if (subscription.status !== 'Active') {
      return `Subscription is not active (status: ${subscription.status}).`;
    }
    if (BigInt(subscription.totalCharged) >= BigInt(subscription.totalCap)) {
      return `Charge cap reached: ${formatAmount(
        subscription.totalCharged,
      )} of ${formatAmount(subscription.totalCap)} charged.`;
    }
    if (
      ledger !== undefined &&
      ledger !== null &&
      BigInt(ledger) < BigInt(subscription.nextChargeLedger)
    ) {
      return `Not due yet: next charge is allowed at ledger ${formatAmount(
        subscription.nextChargeLedger,
      )} (current ledger ${formatAmount(ledger)}).`;
    }
    return null;
  }, [disabledReason, subscription, ledger]);

  const isDisabled = notDueReason !== null || status === 'pending';

  const handleClick = useCallback(async () => {
    setRefusal(null);
    reset();
    try {
      await run(() => charge(subscription.id));
      onCharged?.(subscription);
    } catch (err) {
      if (err instanceof ContractError) {
        setRefusal(err.message);
      } else {
        setRefusal(
          err instanceof Error
            ? err.message
            : 'Charge failed: the contract refused the transaction.',
        );
      }
    }
  }, [run, reset, subscription, onCharged]);

  const displayError = refusal ?? error?.message ?? null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        title={notDueReason ?? undefined}
        aria-describedby={notDueReason ? 'charge-button-reason' : undefined}
      >
        {status === 'pending' ? 'Charging…' : 'Charge'}
      </button>
      {notDueReason && (
        <p id="charge-button-reason" role="note">
          {notDueReason}
        </p>
      )}
      <TxProgress
        status={status}
        error={displayError}
        withCheck
      />
    </div>
  );
}

export default ChargeButton;