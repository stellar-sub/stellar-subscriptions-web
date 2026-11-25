"use client";

import Link from "next/link";
import { describeInterval } from "@/lib/format";
import { PlanBadge } from "@/components/plan/PlanBadge";
import { TokenAmount } from "@/components/ui/TokenAmount";
import type { Plan } from "@/types";

/** Tooltip text explaining why the name field is read-only. */
const RENAME_LIMITATION =
  "Plan names are stored on-chain at creation time. The plan contract does not expose an update function, so the name cannot be changed after the plan is published.";

interface MerchantPlansTableProps {
  plans: Plan[];
}

export function MerchantPlansTable({ plans }: MerchantPlansTableProps) {
  if (!plans || plans.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-muted">
        You have not published any plans yet.
      </div>
    );
  }

  return (
    <div>
      {/* ── Stacked cards on narrow screens ──────────────────────────────── */}
      <ul className="space-y-3 md:hidden" aria-label="Your plans">
        {plans.map((plan) => (
          <li key={plan.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {/* Name with limitation note */}
                <p className="truncate font-medium text-fg">{plan.name}</p>
                <p
                  className="mt-0.5 text-xs text-muted"
                  title={RENAME_LIMITATION}
                >
                  Name cannot be changed after creation.
                </p>
                <p className="mt-1 text-sm text-muted">
                  <TokenAmount token={plan.token} value={plan.amountPerPeriod} />
                  {" · "}
                  {describeInterval(plan.intervalLedgers)}
                </p>
              </div>
              <PlanBadge active={plan.active} />
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Suggested cap</dt>
                <dd className="text-right text-fg">
                  <TokenAmount token={plan.token} value={plan.defaultCap} />
                </dd>
              </div>
            </dl>
            <p className="mt-1 text-xs text-muted">Subscribers choose their own cap.</p>
            <div className="mt-3">
              <Link
                href={`/plans/${plan.id}`}
                className="text-sm font-medium text-brand hover:underline"
              >
                View public page
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {/* ── Table on md+ ─────────────────────────────────────────────────── */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-3 py-2 font-medium">
                Name
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Amount
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Interval
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Suggested cap
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td className="px-3 py-3">
                  <span className="font-medium text-fg">{plan.name}</span>
                  {/* Limitation notice below the name */}
                  <span
                    className="mt-0.5 block text-xs text-muted"
                    title={RENAME_LIMITATION}
                  >
                    Name cannot be changed after creation.
                  </span>
                </td>
                <td className="px-3 py-3 text-fg">
                  <TokenAmount token={plan.token} value={plan.amountPerPeriod} />
                </td>
                <td className="px-3 py-3 text-fg">
                  {describeInterval(plan.intervalLedgers)}
                </td>
                <td className="px-3 py-3 text-fg">
                  <TokenAmount token={plan.token} value={plan.defaultCap} />
                  <span className="block text-xs text-muted">
                    Subscribers choose their own cap.
                  </span>
                </td>
                <td className="px-3 py-3">
                  <PlanBadge active={plan.active} />
                </td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={`/plans/${plan.id}`}
                    className="text-sm font-medium text-brand hover:underline"
                  >
                    View public page
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
