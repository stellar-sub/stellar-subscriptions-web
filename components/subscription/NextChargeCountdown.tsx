"use client";

import { useLedger } from "@/hooks/useLedger";
import { useWallet } from "@/hooks/useWallet";
import { approxDuration, formatDateTime, formatLedgers } from "@/lib/format";
import { estimateLedgerDate } from "@/lib/contracts";
import { ledgersUntilNextCharge } from "@/lib/subscription";
import { SubStatus, type Subscription } from "@/types";

export interface NextChargeCountdownProps {
  sub: Subscription;
  /**
   * The latest ledger sequence to anchor the date estimate to. Falls back to
   * the live ledger when omitted, so callers without a closer reference can
   * leave this unset.
   */
  latestLedger?: number | null;
  /**
   * When `latestLedger` closed. Falls back to the observed time of the live
   * ledger when omitted. Pass a charge event's `ledgerClosedAt` for a tighter
   * estimate.
   */
  latestClosedAt?: Date | null;
}

/**
 * When the contract will next allow a charge. The contract counts ledgers,
 * so this reads the live ledger and words the time as an estimate. "Allowed"
 * never means "will happen": the merchant chooses whether to charge.
 */
export function NextChargeCountdown({ sub, latestLedger, latestClosedAt }: NextChargeCountdownProps) {
  const { network } = useWallet();
  const { sequence, observedAt, stale } = useLedger(network);

  if (sub.status === SubStatus.Cancelled) {
    return <Line label="Next charge" value="None — cancelled" />;
  }
  if (sub.status === SubStatus.Exhausted) {
    return <Line label="Next charge" value="None — cap fully charged" />;
  }
  if (sub.status === SubStatus.Paused) {
    return <Line label="Next charge" value="None while paused" />;
  }
  if (sequence === null) {
    return <Line label="Next charge" value="Checking the ledger…" />;
  }

  const remaining = ledgersUntilNextCharge(sub, sequence);
  if (remaining <= 0) {
    return (
      <Line
        label="Next charge"
        value="Allowed now"
        note="The merchant may charge one period. Allowed doesn't mean it will happen on any set day."
        stale={stale}
      />
    );
  }

  // The wall-clock estimate needs a reference ledger and its close time. Prefer
  // the caller's values and fall back to the live ledger we just read, so the
  // date shows even when no closer reference is supplied.
  const refLedger = latestLedger ?? sequence;
  const refClosedAt = latestClosedAt ?? (observedAt ? new Date(observedAt) : null);
  const estimate = refLedger != null && refClosedAt ? estimateLedgerDate(sub.nextChargeLedger, refLedger, refClosedAt) : null;

  return (
    <Line
      label="Next charge"
      value={`Not before ${approxDuration(remaining)}`}
      note={`${formatLedgers(remaining)} from now. Before then the contract refuses any charge.`}
      estimate={estimate}
      stale={stale}
    />
  );
}

function Line({
  label,
  value,
  note,
  estimate,
  stale,
}: {
  label: string;
  value: string;
  note?: string;
  estimate?: Date | null;
  stale?: boolean;
}) {
  return (
    <div className="text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted">{label}</span>
        <span className="text-right font-medium text-fg">{value}</span>
      </div>
      {estimate && (
        <p className="mt-0.5 text-right text-xs text-muted">
          <time dateTime={estimate.toISOString()}>approx. {formatDateTime(estimate)}</time>
        </p>
      )}
      {note && <p className="mt-0.5 text-right text-xs text-muted">{note}</p>}
      {stale && (
        <p className="mt-0.5 text-right text-xs text-amber-600" role="status">
          Ledger data is out of date — this time may no longer be accurate.
        </p>
      )}
    </div>
  );
}
