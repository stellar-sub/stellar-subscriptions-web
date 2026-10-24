"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useMerchantPlans } from "@/hooks/usePlans";
import { isValidStellarAddress, shortAddress } from "@/lib/format";
import { PlanGrid, type SortBy, type SortOrder } from "@/components/plan/PlanGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingBlock } from "@/components/ui/Spinner";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price", label: "Price" },
  { value: "interval", label: "Interval" },
];

export default function MerchantPage() {
  const params = useParams();
  const address = params.address as string;
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [page, setPage] = useState(0);

  const isValid = isValidStellarAddress(address);
  const plans = useMerchantPlans(isValid ? address : null);

  if (!isValid) {
    return (
      <div className="space-y-6">
        <ErrorState
          error={new Error("Invalid merchant address")}
          title="Invalid address"
          onRetry={() => window.location.reload()}
        />
        <Link href="/plans" className="btn-secondary">
          Back to all plans
        </Link>
      </div>
    );
  }

  const pageSize = 12;
  const totalPages = plans.data ? Math.ceil(plans.data.length / pageSize) : 0;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-fg">
            Plans by <span className="font-mono">{shortAddress(address)}</span>
          </h1>
          <Link href="/plans" className="text-sm text-brand hover:underline">
            View all plans
          </Link>
        </div>
        <p className="max-w-2xl text-sm text-muted">
          All subscription plans offered by this merchant.
        </p>
      </header>

      {plans.error ? (
        <ErrorState error={plans.error} title="Couldn't load merchant plans" onRetry={plans.reload} />
      ) : !plans.data ? (
        <LoadingBlock label="Loading merchant plans" />
      ) : (
        <>
          {plans.data.length > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="sort-by" className="text-sm font-medium text-muted">
                  Sort by:
                </label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortBy);
                    setPage(0);
                  }}
                  className="rounded border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="sort-order" className="text-sm font-medium text-muted">
                  Order:
                </label>
                <select
                  id="sort-order"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="rounded border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>

              {plans.data.length > pageSize && (
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="rounded border border-border px-3 py-2 text-sm text-fg disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded border border-border px-3 py-2 text-sm text-fg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          <PlanGrid
            plans={plans.data}
            sortBy={sortBy}
            sortOrder={sortOrder}
            page={page}
            pageSize={pageSize}
            empty={
              <EmptyState
                title="No plans from this merchant"
                description="This merchant hasn't published any plans yet."
                action={
                  <Link href="/plans" className="btn-secondary">
                    Browse all plans
                  </Link>
                }
              />
            }
          />
        </>
      )}
    </div>
  );
}
