import Link from "next/link";
import { describeInterval, maxCharges, pluralize, shortAddress } from "@/lib/format";
import { TokenAmount } from "@/components/ui/TokenAmount";
import type { Plan } from "@/types";
import { PlanBadge } from "./PlanBadge";

export function PlanCard({ plan }: { plan: Plan }) {
  return (
    <Link
      href={`/plans/${plan.id}`}
      className="card group flex flex-col gap-4 p-5 transition hover:border-brand/50"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-fg group-hover:text-brand">{plan.name}</h3>
        <PlanBadge active={plan.active} />
      </div>
      <p className="text-2xl font-semibold text-fg">
        <TokenAmount token={plan.token} value={plan.amountPerPeriod} />
        <span className="ml-1 text-sm font-normal text-muted">{describeInterval(plan.intervalLedgers)}</span>
      </p>
      <dl className="mt-auto grid grid-cols-2 gap-2 text-xs text-muted">
        <div>
          <dt>Suggested cap</dt>
          <dd className="text-fg">
            <TokenAmount token={plan.token} value={plan.defaultCap} />
          </dd>
        </div>
        <div>
          <dt>At most</dt>
          <dd className="text-fg">{pluralize(maxCharges(plan.defaultCap, plan.amountPerPeriod), "charge")}</dd>
        </div>
        <div className="col-span-2">
          <dt>Merchant</dt>
          <dd className="font-mono text-fg">{shortAddress(plan.merchant)}</dd>
        </div>
      </dl>
    </Link>
  );
}
