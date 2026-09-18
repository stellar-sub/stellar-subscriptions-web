"use client";

import { useAsync } from "@/hooks/useAsync";
import { useWallet } from "@/hooks/useWallet";
import { getRegistryStats } from "@/lib/contracts";
import { formatAmount } from "@/lib/format";
import { NETWORKS } from "@/lib/stellar";
import { ErrorState } from "@/components/ui/ErrorState";
import { Spinner } from "@/components/ui/Spinner";

/** Live totals from the registry contract. */
export function PlatformStats() {
  const { network } = useWallet();
  const { data, error, loading, reload } = useAsync(() => getRegistryStats(network), [network]);

  if (error) return <ErrorState error={error} title="Couldn't load platform stats" onRetry={reload} />;

  const tiles = [
    { label: "Plans published", value: data?.totalPlans.toLocaleString("en-US") },
    { label: "Subscriptions created", value: data?.totalSubscriptions.toLocaleString("en-US") },
    { label: "Active right now", value: data?.activeSubscriptions.toLocaleString("en-US") },
    { label: "Charged so far", value: data ? formatAmount(data.totalChargedVolume, 7, 2) : undefined },
  ];

  return (
    <div>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="card p-4">
            <dt className="text-xs text-muted">{tile.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-fg">
              {loading && tile.value === undefined ? <Spinner label={`Loading ${tile.label}`} /> : tile.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted">
        Read live from the registry contract on {NETWORKS[network].label}. &ldquo;Charged so far&rdquo; adds up
        raw amounts across every token, shown with 7 decimals — an activity measure, not a currency total.
      </p>
    </div>
  );
}
