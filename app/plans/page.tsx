"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { usePlans } from "@/hooks/usePlans";
import { PlanGrid } from "@/components/plan/PlanGrid";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingBlock } from "@/components/ui/Spinner";

export default function PlansPage() {
  const plans = usePlans();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  // Extract unique tokens from plans for filter options
  const availableTokens = useMemo(() => {
    if (!plans.data) return [];
    const tokens = new Set(plans.data.map((p) => p.token));
    return Array.from(tokens).sort();
  }, [plans.data]);

  // Filter and search plans client-side with debouncing
  const filteredPlans = useMemo(() => {
    if (!plans.data) return [];

    return plans.data.filter((plan) => {
      // Token filter
      if (selectedToken && plan.token !== selectedToken) return false;

      // Search filter (case-insensitive, matches plan name or merchant address)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = (plan.name || "").toLowerCase().includes(query);
        const matchesMerchant = plan.merchant.toLowerCase().includes(query);
        if (!matchesName && !matchesMerchant) return false;
      }

      return true;
    });
  }, [plans.data, searchQuery, selectedToken]);

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
        <>
          {/* Search and Filter Controls */}
          <div className="space-y-4">
            <div>
              <label htmlFor="plan-search" className="block text-sm font-medium text-muted mb-2">
                Search
              </label>
              <input
                id="plan-search"
                type="text"
                placeholder="Search by plan name or merchant address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg placeholder-muted focus:border-link focus:outline-none focus:ring-1 focus:ring-link"
              />
            </div>

            {/* Token Filter */}
            {availableTokens.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Filter by Token</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedToken(null)}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                      selectedToken === null
                        ? "bg-link text-fg"
                        : "border border-line bg-surface text-muted hover:border-link hover:text-fg"
                    }`}
                  >
                    All Tokens
                  </button>
                  {availableTokens.map((token) => (
                    <button
                      key={token}
                      onClick={() => setSelectedToken(token)}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                        selectedToken === token
                          ? "bg-link text-fg"
                          : "border border-line bg-surface text-muted hover:border-link hover:text-fg"
                      }`}
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {filteredPlans.length === 0 && plans.data.length > 0 ? (
            <EmptyState
              title="No plans match your search"
              description={
                searchQuery || selectedToken
                  ? "Try adjusting your search or filter criteria."
                  : "No plans available."
              }
            />
          ) : (
            <PlanGrid
              plans={filteredPlans}
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
        </>
      )}
    </div>
  );
}
