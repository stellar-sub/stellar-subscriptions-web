import { capPercent, unchargeableRemainder } from "@/lib/format";
import { TokenAmount } from "@/components/ui/TokenAmount";
import { SubStatus, type Subscription } from "@/types";

/**
 * How much of the cap has been charged. Shown on every subscription view:
 * the cap is the most that can ever be taken, so it is never hidden.
 *
 * The bar has two segments:
 *   – charged fill   : the portion already taken
 *   – unchargeable   : the leftover that is smaller than one period's amount,
 *                      so the contract can never charge it
 */
export function CapProgress({ sub }: { sub: Subscription }) {
  const percent = capPercent(sub.totalCharged, sub.totalCap);
  const remainder = unchargeableRemainder(sub.totalCap, sub.amountPerPeriod);
  const remainderPercent = sub.totalCap > 0n
    ? Number((remainder * 10_000n) / sub.totalCap) / 100
    : 0;
  const ended = sub.status === SubStatus.Cancelled;
  const label = `${percent}% of the cap charged`;

  const chargedColor = ended ? "bg-muted" : percent >= 100 ? "bg-warn" : "bg-brand";

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">Charged so far</span>
        <span className="text-fg">
          <TokenAmount token={sub.token} value={sub.totalCharged} className="font-medium" />
          <span className="text-muted"> of </span>
          <TokenAmount token={sub.token} value={sub.totalCap} />
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2.5 overflow-hidden rounded-full bg-raised"
      >
        {/* charged portion */}
        <div
          className={`h-full float-left rounded-l-full transition-all motion-reduce:transition-none ${chargedColor}`}
          style={{ width: `${percent}%` }}
        />
        {/* unchargeable remainder — hatched and greyed */}
        {remainderPercent > 0 && (
          <div
            data-testid="unchargeable-segment"
            title="This slice is smaller than one period's charge, so the contract can never collect it."
            className="h-full float-left rounded-r-full opacity-40"
            style={{
              width: `${remainderPercent}%`,
              backgroundImage:
                "repeating-linear-gradient(-45deg, currentColor 0, currentColor 2px, transparent 2px, transparent 6px)",
            }}
          />
        )}
      </div>
      <p className="text-xs text-muted">
        {ended
          ? "Cancelled. Nothing more can be charged."
          : percent >= 100
            ? "The whole cap has been charged. Nothing more can be taken."
            : remainderPercent > 0
              ? "The last slice of the cap is smaller than one period's charge and can never be collected."
              : "The merchant can never charge past this cap."}
      </p>
    </div>
  );
}
