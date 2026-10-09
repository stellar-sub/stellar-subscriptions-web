"use client";

import Link from "next/link";
import { usePlans } from "@/hooks/usePlans";
import { PlanGrid } from "@/components/plan/PlanGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingBlock } from "@/components/ui/Spinner";

export default function PlansPage() {
  const plans = usePlans();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-fg">Plans</h1>
        <p className="max-w-2xl text-sm text-muted">
          Every plan currently accepting subscribers. Opening a plan shows exactly what you&apos;d authorize before
          you sign anything.
        </p>
      </header>

      {plans.error ? (
        <ErrorState error={plans.error} title="Couldn't load plans" onRetry={plans.reload} />
      ) : !plans.data ? (
        <LoadingBlock label="Loading plans" />
      ) : (
        <PlanGrid
          plans={plans.data}
          empty={
            <EmptyState
              title="No plans yet"
              description="No merchant has published a plan on this network. Merchants can create one from their dashboard."
              action={
                <Link href="/merchant/plans/new" className="btn-secondary">
                  Create a plan
                </Link>
              }
            />
          }
        />
      )}
    </div>
  );
}
