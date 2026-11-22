"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useTx } from "@/hooks/useTx";
import { pauseSubscription } from "@/lib/contract";
import { sortForDisplay } from "@/lib/subscription";
import { scoreHealth, type HealthLevel } from "@/lib/subscription-health";
import { CommittedSpend } from "@/components/subscription/CommittedSpend";
import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import { AllowanceBanner } from "@/components/subscription/AllowanceBanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingBlock } from "@/components/ui/Spinner";
import { RequireWallet } from "@/components/wallet/RequireWallet";
import { SubStatus, type Subscription } from "@/types";

const BASE_TITLE = "My Subscriptions";

export type SortKey = "default" | "amount" | "next-charge";

const VALID_STATUSES = ["all", "active", "paused", "cancelled", "exhausted"] as const;
type StatusFilter = (typeof VALID_STATUSES)[number];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "amount", label: "Amount" },
  { value: "next-charge", label: "Next charge" },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
  { value: "exhausted", label: "Exhausted" },
];

const STATUS_PARAM_TO_ENUM: Record<Exclude<StatusFilter, "all">, SubStatus> = {
  active: SubStatus.Active,
  paused: SubStatus.Paused,
  cancelled: SubStatus.Cancelled,
  exhausted: SubStatus.Exhausted,
};

/** Browser-tab title: the active count once loaded, the bare title otherwise. */
function subscriptionsTitle(activeCount: number | undefined): string {
  return activeCount === undefined ? BASE_TITLE : `${BASE_TITLE} (${activeCount})`;
}

function parseStatusParam(raw: string | null): StatusFilter {
  if (raw && (VALID_STATUSES as readonly string[]).includes(raw)) {
    return raw as StatusFilter;
  }
  return "all";
}

function parseSortParam(raw: string | null): SortKey {
  const valid: SortKey[] = ["default", "amount", "next-charge"];
  if (raw && valid.includes(raw as SortKey)) return raw as SortKey;
  return "default";
}

function applyFilter(subs: Subscription[], status: StatusFilter): Subscription[] {
  if (status === "all") return subs;
  const target = STATUS_PARAM_TO_ENUM[status];
  return subs.filter((s) => s.status === target);
}

function applySort(subs: Subscription[], sort: SortKey): Subscription[] {
  if (sort === "amount") {
    return [...subs].sort((a, b) => Number(b.amountPerPeriod - a.amountPerPeriod));
  }
  if (sort === "next-charge") {
    return [...subs].sort((a, b) => a.nextChargeLedger - b.nextChargeLedger);
  }
  return sortForDisplay(subs);
}

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

      <RequireWallet purpose="see your subscriptions">{(address) => <Subscriptions address={address} />}</RequireWallet>
    </div>
  );
}

type PauseAllResult = { sub: Subscription; ok: boolean; error?: string };

function Subscriptions({ address }: { address: string }) {
  const subs = useSubscriptions(address);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tx = useTx();

  const [pauseAllOpen, setPauseAllOpen] = useState(false);
  const [pauseAllRunning, setPauseAllRunning] = useState(false);
  const [pauseAllResults, setPauseAllResults] = useState<PauseAllResult[] | null>(null);

  const statusFilter = parseStatusParam(searchParams.get("status"));
  const sortKey = parseSortParam(searchParams.get("sort"));

  const activeSubs = subs.data?.filter((sub) => sub.status === SubStatus.Active) ?? [];
  const activeCount = subs.data ? activeSubs.length : undefined;

  useEffect(() => {
    document.title = subscriptionsTitle(activeCount);
  }, [activeCount]);

  // Don't leave a stale count behind when the list unmounts (e.g. wallet disconnects).
  useEffect(
    () => () => {
      document.title = BASE_TITLE;
    },
    [],
  );

  async function runPauseAll() {
    setPauseAllRunning(true);
    const results: PauseAllResult[] = [];
    for (const sub of activeSubs) {
      try {
        await tx.run(() => pauseSubscription(address, sub.id));
        results.push({ sub, ok: true });
      } catch (err) {
        results.push({ sub, ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
    setPauseAllResults(results);
    setPauseAllRunning(false);
    setPauseAllOpen(false);
    subs.reload();
  }

  function updateParams(updates: { status?: StatusFilter; sort?: SortKey }) {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.status !== undefined) {
      if (updates.status === "all") {
        params.delete("status");
      } else {
        params.set("status", updates.status);
      }
    }
    if (updates.sort !== undefined) {
      if (updates.sort === "default") {
        params.delete("sort");
      } else {
        params.set("sort", updates.sort);
      }
    }
    const qs = params.toString();
    // Filter/sort changes update in-place — no new history entry.
    router.replace(qs ? `?${qs}` : "?");
  }

  if (subs.error) {
    return <ErrorState error={subs.error} title="Couldn't load your subscriptions" onRetry={subs.reload} />;
  }
  if (!subs.data) return <LoadingBlock label="Loading your subscriptions" />;

  if (subs.data.length === 0) {
    return (
      <EmptyState
        title="No subscriptions yet"
        description="When you subscribe to a plan, it shows up here with your cap, what's been charged, and controls to pause or cancel."
        action={
          <Link href="/plans" className="btn-primary">
            Browse plans
          </Link>
        }
      />
    );
  }

  const filtered = applyFilter(subs.data, statusFilter);
  const ordered = applySort(filtered, sortKey);
  // scoreHealth uses its own Subscription shape (status as string); map across.
  const healthInput = subs.data.map((s) => ({
    id: String(s.id),
    amount: Number(s.amountPerPeriod),
    status: s.status === SubStatus.Active ? "active" : s.status === SubStatus.Paused ? "paused" : "cancelled",
  }));
  const health = scoreHealth(healthInput, subs.balances ?? [], subs.allowances ?? []);

  return (
    <div className="space-y-6">
      <HealthBadge health={health} />
      <AllowanceBanner subs={subs.data} />
      <CommittedSpend subs={subs.data} />

      {activeSubs.length > 0 && (
        <div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setPauseAllResults(null);
              setPauseAllOpen(true);
            }}
          >
            Pause all
          </button>
        </div>
      )}

      {pauseAllResults && (
        <div className="rounded border border-border bg-surface p-4" role="status">
          <h2 className="mb-2 text-sm font-semibold text-fg">Pause all results</h2>
          <ul className="space-y-1 text-sm">
            {pauseAllResults.map(({ sub, ok, error }) => (
              <li key={sub.id} className={ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                Subscription #{String(sub.id)}: {ok ? "paused" : `failed${error ? ` — ${error}` : ""}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pauseAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-fg">Pause all subscriptions?</h2>
            <p className="text-sm text-muted">The following subscriptions will be paused:</p>
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-fg">
              {activeSubs.map((sub) => (
                <li key={sub.id}>#{String(sub.id)}</li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPauseAllOpen(false)}
                disabled={pauseAllRunning}
              >
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={runPauseAll} disabled={pauseAllRunning}>
                {pauseAllRunning ? "Pausing…" : "Pause all"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-muted">
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => updateParams({ status: e.target.value as StatusFilter })}
            className="rounded border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort-key" className="text-sm font-medium text-muted">
            Sort by:
          </label>
          <select
            id="sort-key"
            value={sortKey}
            onChange={(e) => updateParams({ sort: e.target.value as SortKey })}
            className="rounded border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-brand"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {ordered.length === 0 ? (
        <EmptyState
          title={`No ${statusFilter} subscriptions`}
          description="Try a different filter to see your other subscriptions."
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {ordered.map((sub) => (
            <li key={sub.id}>
              <Link href={`/subscriptions/${sub.id}`} className="block">
                <SubscriptionCard sub={sub} onChanged={subs.reload} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const HEALTH_STYLES: Record<HealthLevel, { label: string; className: string }> = {
  good: { label: "Good", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  "at-risk": { label: "At Risk", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  critical: { label: "Critical", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
};

function HealthBadge({ health }: { health: HealthLevel }) {
  const { label, className } = HEALTH_STYLES[health];
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Subscription health</span>
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
        {label}
      </span>
    </div>
  );
}
