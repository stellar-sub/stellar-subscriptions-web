"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { LedgerClockProvider } from "@/hooks/useLedger";
import { sortForDisplay } from "@/lib/subscription";
import { SubStatus } from "@/types";
import { CommittedSpend } from "@/components/subscription/CommittedSpend";
import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { RequireWallet } from "@/components/wallet/RequireWallet";

type SortBy = "nextCharge" | "amount" | "newest";
type StatusFilter = "all" | "active" | "paused" | "ended";

export default function MySubscriptionsPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-fg">My subscriptions</h1>
        <p className="max-w-2xl text-sm text-muted">
          Everything you&apos;ve authorized. Pause or cancel any of it here — a cancelled subscription can never be
          charged again.
        </p>
      </header>

      <RequireWallet purpose="see your subscriptions">
        {(address) => (
          <LedgerClockProvider>
            <Subscriptions address={address} />
          </LedgerClockProvider>
        )}
      </RequireWallet>
    </div>
  );
}

function Subscriptions({ address }: { address: string }) {
  const subs = useSubscriptions(address);
  const router = useRouter();
  const searchParams = useSearchParams();

  const statusFilter = (searchParams.get("status") as StatusFilter) || "all";
  const sortBy = (searchParams.get("sort") as SortBy) || "nextCharge";
  const groupByMerchant = searchParams.get("group") === "merchant";
  const [showEnded, setShowEnded] = useState(false);

  const updateUrl = (updates: { status?: StatusFilter; sort?: SortBy; group?: boolean }) => {
    const params = new URLSearchParams(searchParams);
    if (updates.status !== undefined) params.set("status", updates.status);
    if (updates.sort !== undefined) params.set("sort", updates.sort);
    if (updates.group !== undefined) {
      updates.group ? params.set("group", "merchant") : params.delete("group");
    }
    router.push(`?${params.toString()}`);
  };

  const exportToCSV = () => {
    if (!subs.data) return;

    const headers = ["Merchant", "Token", "Amount", "Interval", "Cap", "Charged", "Status"];
    const rows = subs.data.map((sub) => [
      sub.merchant,
      sub.token,
      sub.amountPerPeriod.toString(),
      sub.intervalLedgers.toString(),
      sub.totalCap.toString(),
      sub.totalCharged.toString(),
      Object.keys(SubStatus)[sub.status],
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (subs.error) {
    return <ErrorState error={subs.error} title="Couldn't load your subscriptions" onRetry={subs.reload} />;
  }
  if (!subs.data) return <SubscriptionsSkeleton />;

  if (subs.data.length === 0) {
    return (
      <EmptyState
        title="No subscriptions yet"
        description={
          <>
            When you subscribe to a plan, it shows up here with your cap, what&apos;s been charged, and controls to
            pause or cancel.{" "}
            <Link href="/help" className="text-brand hover:underline">
              How caps and intervals work
            </Link>
          </>
        }
        action={
          <Link href="/plans" className="btn-primary">
            Browse plans
          </Link>
        }
      />
    );
  }

  const isEnded = (sub: any) =>
    sub.status === SubStatus.Cancelled || sub.status === SubStatus.Exhausted;

  const filterSubs = (data: any[]) => {
    return data.filter((sub) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return sub.status === SubStatus.Active;
      if (statusFilter === "paused") return sub.status === SubStatus.Paused;
      if (statusFilter === "ended") return isEnded(sub);
      return true;
    });
  };

  const sortSubs = (data: any[]) => {
    const sorted = [...data];
    if (sortBy === "amount") {
      sorted.sort((a, b) => Number(b.amountPerPeriod) - Number(a.amountPerPeriod));
    } else if (sortBy === "newest") {
      sorted.sort((a, b) => b.id - a.id);
    }
    return sorted;
  };

  const activeSubs = filterSubs(subs.data).filter((s) => !isEnded(s));
  const endedSubs = subs.data.filter(isEnded);
  const sortedActive = sortSubs(activeSubs);

  const groupedSubs = groupByMerchant
    ? sortedActive.reduce(
        (acc, sub) => {
          if (!acc[sub.merchant]) acc[sub.merchant] = [];
          acc[sub.merchant].push(sub);
          return acc;
        },
        {} as Record<string, any[]>,
      )
    : null;

  return (
    <div className="space-y-6">
      <CommittedSpend subs={activeSubs} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-muted">
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => updateUrl({ status: e.target.value as StatusFilter })}
            className="rounded border border-border bg-surface px-3 py-2 text-sm text-fg"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="ended">Ended</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm font-medium text-muted">
            Sort by:
          </label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => updateUrl({ sort: e.target.value as SortBy })}
            className="rounded border border-border bg-surface px-3 py-2 text-sm text-fg"
          >
            <option value="nextCharge">Next charge</option>
            <option value="amount">Amount</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        <button
          onClick={() => updateUrl({ group: !groupByMerchant })}
          className={`rounded px-3 py-2 text-sm font-medium ${
            groupByMerchant ? "bg-brand text-brand-foreground" : "border border-border bg-surface text-fg"
          }`}
        >
          {groupByMerchant ? "Grouped by merchant" : "Group by merchant"}
        </button>

        <button
          onClick={exportToCSV}
          className="ml-auto rounded border border-border bg-surface px-3 py-2 text-sm text-fg hover:bg-surface-hover"
        >
          Export CSV
        </button>
      </div>

      {groupedSubs ? (
        <div className="space-y-6">
          {Object.entries(groupedSubs).map(([merchant, subList]) => {
            const merchantTotal = subList.reduce((sum, sub) => sum + Number(sub.amountPerPeriod), 0n);
            return (
              <section key={merchant} className="space-y-2">
                <h3 className="text-sm font-semibold text-fg">{merchant}</h3>
                <ul className="grid gap-4 lg:grid-cols-2">
                  {subList.map((sub) => (
                    <li key={sub.id}>
                      <SubscriptionCard sub={sub} onChanged={subs.reload} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {sortedActive.map((sub) => (
            <li key={sub.id}>
              <SubscriptionCard sub={sub} onChanged={subs.reload} />
            </li>
          ))}
        </ul>
      )}

      {endedSubs.length > 0 && (
        <details className="border-t border-line pt-6">
          <summary className="cursor-pointer text-sm font-medium text-fg">
            Ended subscriptions ({endedSubs.length})
          </summary>
          <ul className="mt-4 grid gap-4 lg:grid-cols-2">
            {endedSubs.map((sub) => (
              <li key={sub.id}>
                <SubscriptionCard sub={sub} onChanged={subs.reload} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function SubscriptionsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading subscriptions</span>
      <div aria-hidden="true" className="space-y-6">
        <div className="card animate-pulse space-y-3">
          <div className="h-4 w-40 rounded bg-border" />
          <div className="h-8 w-32 rounded bg-border" />
        </div>
        <ul className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <div className="card animate-pulse space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="h-5 w-40 rounded bg-border" />
                    <div className="h-3 w-24 rounded bg-border" />
                  </div>
                  <div className="h-6 w-16 rounded-full bg-border" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-border" />
                  <div className="h-2 w-full rounded-full bg-border" />
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-24 rounded bg-border" />
                  <div className="h-9 w-24 rounded bg-border" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
