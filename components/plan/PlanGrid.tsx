import type { ReactNode } from "react";
import type { Plan } from "@/types";
import { PlanCard } from "./PlanCard";
import { normalizeTo30Days } from "@/lib/format";

export type SortBy = "price" | "interval" | "newest";
export type SortOrder = "asc" | "desc";

interface PlanGridProps {
  plans: Plan[];
  empty: ReactNode;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}

function getSortKey(plan: Plan, sortBy: SortBy): string | number | bigint {
  switch (sortBy) {
    case "price":
      return `${plan.token}:${normalizeTo30Days(plan.amountPerPeriod, plan.intervalLedgers)}`;
    case "interval":
      return plan.intervalLedgers;
    case "newest":
      return plan.createdAt;
  }
}

function comparePlans(a: Plan, b: Plan, sortBy: SortBy, sortOrder: SortOrder): number {
  const keyA = getSortKey(a, sortBy);
  const keyB = getSortKey(b, sortBy);

  let cmp = 0;
  if (sortBy === "price") {
    const [tokenA, costA] = String(keyA).split(":");
    const [tokenB, costB] = String(keyB).split(":");
    if (tokenA !== tokenB) {
      cmp = tokenA.localeCompare(tokenB);
    } else {
      cmp = BigInt(costA) < BigInt(costB) ? -1 : BigInt(costA) > BigInt(costB) ? 1 : 0;
    }
  } else if (typeof keyA === "number" && typeof keyB === "number") {
    cmp = keyA - keyB;
  } else if (typeof keyA === "bigint" && typeof keyB === "bigint") {
    cmp = keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }

  return sortOrder === "desc" ? -cmp : cmp;
}

export function PlanGrid({
  plans,
  empty,
  sortBy = "newest",
  sortOrder = "desc",
  page = 0,
  pageSize = 12,
}: PlanGridProps) {
  if (plans.length === 0) return <>{empty}</>;

  const sorted = [...plans].sort((a, b) => comparePlans(a, b, sortBy, sortOrder));
  const start = page * pageSize;
  const end = start + pageSize;
  const paginated = sorted.slice(start, end);

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {paginated.map((plan) => (
        <li key={plan.id} className="flex">
          <div className="flex w-full flex-col [&>a]:flex-1">
            <PlanCard plan={plan} />
          </div>
        </li>
      ))}
    </ul>
  );
}
