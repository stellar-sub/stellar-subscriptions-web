"use client";

import Link from "next/link";
import type { Plan } from "@/types";
import { TokenAmount } from "@/components/ui/TokenAmount";
import { describeInterval } from "@/lib/format";

interface MerchantPlansTableProps {
  plans: Plan[];
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="rounded-full border border-ok/30 bg-ok/10 px-2 py-0.5 text-xs font-medium text-ok">Active</span>
  ) : (
    <span className="rounded-full border border-line bg-raised px-2 py-0.5 text-xs font-medium text-muted">
      Inactive
    </span>
  );
}

export function MerchantPlansTable({ plans }: MerchantPlansTableProps) {
  if (!plans || plans.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        You have not published any plans yet.
      </div>
    );
  }

  return (
    <div>
      {/* Stacked cards on narrow screens */}
      <ul className="space-y-3 md:hidden">
        {plans.map((plan) => (
          <li
            key={plan.id}
            className={`rounded-lg border border-gray-200 p-4 shadow-sm ${plan.active ? "" : "opacity-50"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{plan.name}</p>
                <p className="mt-1 text-sm text-gray-600">
                  <TokenAmount value={plan.amountPerPeriod} token={plan.token} />
                  {" · "}
                  {describeInterval(plan.intervalLedgers)}
                </p>
              </div>
              <StatusBadge active={plan.active} />
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Suggested cap</dt>
                <dd className="text-right text-gray-900">
                  <TokenAmount value={plan.defaultCap} token={plan.token} />
                </dd>
              </div>
            </dl>
            <p className="mt-1 text-xs text-gray-500">Subscribers choose their own cap.</p>
            <div className="mt-3">
              <Link href={`/plans/${plan.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                View public page
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {/* Table on md+ */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
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
          <tbody className="divide-y divide-gray-100">
            {plans.map((plan) => (
              <tr key={plan.id} className={plan.active ? undefined : "opacity-50"}>
                <td className="px-3 py-3 font-medium text-gray-900">{plan.name}</td>
                <td className="px-3 py-3 text-gray-700">
                  <TokenAmount value={plan.amountPerPeriod} token={plan.token} />
                </td>
                <td className="px-3 py-3 text-gray-700">{describeInterval(plan.intervalLedgers)}</td>
                <td className="px-3 py-3 text-gray-700">
                  <TokenAmount value={plan.defaultCap} token={plan.token} />
                  <span className="block text-xs text-gray-500">Subscribers choose their own cap.</span>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge active={plan.active} />
                </td>
                <td className="px-3 py-3 text-right">
                  <Link href={`/plans/${plan.id}`} className="text-sm font-medium text-blue-600 hover:underline">
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
