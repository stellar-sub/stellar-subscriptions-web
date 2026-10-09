import type { ReactNode } from "react";
import type { Plan } from "@/types";
import { PlanCard } from "./PlanCard";

export function PlanGrid({ plans, empty }: { plans: Plan[]; empty: ReactNode }) {
  if (plans.length === 0) return <>{empty}</>;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan) => (
        <li key={plan.id} className="flex">
          <div className="flex w-full flex-col [&>a]:flex-1">
            <PlanCard plan={plan} />
          </div>
        </li>
      ))}
    </ul>
  );
}
