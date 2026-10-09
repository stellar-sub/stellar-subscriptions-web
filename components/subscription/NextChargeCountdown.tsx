"use client";

import { useLedger } from "@/hooks/useLedger";
import { useWallet } from "@/hooks/useWallet";
import { approxDuration, formatLedgers } from "@/lib/format";
import { ledgersUntilNextCharge } from "@/lib/subscription";
import { SubStatus, type Subscription } from "@/types";

/**
 * When the contract will next allow a charge. The contract counts ledgers,
 * so this reads the live ledger and words the time as an estimate. "Allowed"
 * never means "will happen": the merchant chooses whether to charge.
 */
export function NextChargeCountdown({ sub }: { sub: Subscription }) {
  const { network } = useWallet();
  const { sequence } = useLedger(network);

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
      />
    );
  }
  return (
    <Line
      label="Next charge"
      value={`Not before ${approxDuration(remaining)}`}
      note={`${formatLedgers(remaining)} from now. Before then the contract refuses any charge.`}
    />
  );
}

function Line({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted">{label}</span>
        <span className="text-right font-medium text-fg">{value}</span>
      </div>
      {note && <p className="mt-0.5 text-right text-xs text-muted">{note}</p>}
    </div>
  );
}
