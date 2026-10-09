import { capPercent } from "@/lib/format";
import { TokenAmount } from "@/components/ui/TokenAmount";
import { SubStatus, type Subscription } from "@/types";

/**
 * How much of the cap has been charged. Shown on every subscription view:
 * the cap is the most that can ever be taken, so it is never hidden.
 */
export function CapProgress({ sub }: { sub: Subscription }) {
  const percent = capPercent(sub.totalCharged, sub.totalCap);
  const ended = sub.status === SubStatus.Cancelled;
  const label = `${percent}% of the cap charged`;

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
        <div
          className={`h-full rounded-full transition-all ${ended ? "bg-muted" : percent >= 100 ? "bg-warn" : "bg-brand"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-muted">
        {ended
          ? "Cancelled. Nothing more can be charged."
          : percent >= 100
            ? "The whole cap has been charged. Nothing more can be taken."
            : "The merchant can never charge past this cap."}
      </p>
    </div>
  );
}
