"use client";

import { useAsync } from "@/hooks/useAsync";
import { useWallet } from "@/hooks/useWallet";
import { getAllCharges } from "@/lib/contracts";
import { formatAmount } from "@/lib/format";
import { TokenAmount } from "@/components/ui/TokenAmount";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingBlock } from "@/components/ui/Spinner";

export function ChargeHistory({ subscriptionId, token }: { subscriptionId: number; token: string }) {
  const { network } = useWallet();
  const charges = useAsync(() => getAllCharges(network), [network]);

  if (charges.error) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-fg">Charge history</h2>
        <ErrorState error={charges.error} title="Couldn't load charge history" onRetry={charges.reload} />
      </div>
    );
  }

  if (!charges.data) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-fg">Charge history</h2>
        <LoadingBlock label="Loading charges" />
      </div>
    );
  }

  const subCharges = charges.data.filter((c) => c.subscriptionId === subscriptionId);

  if (subCharges.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-fg">Charge history</h2>
        <EmptyState title="No charges yet" description="No charges have been taken from this subscription." />
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded border border-line p-6">
      <h2 className="text-lg font-semibold text-fg">Charge history</h2>
      <div className="space-y-3">
        {subCharges.map((charge) => {
          const estimatedDate = new Date(charge.closedAt);
          return (
            <div key={charge.txHash} className="flex items-center justify-between gap-3 border-b border-line/50 pb-3">
              <div>
                <p className="font-medium text-fg">
                  <TokenAmount token={token} value={charge.amount} />
                </p>
                <p className="text-xs text-muted">
                  {estimatedDate.toLocaleDateString()} at {estimatedDate.toLocaleTimeString()} · Ledger {charge.ledger}
                </p>
              </div>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${charge.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand hover:underline"
              >
                View TX
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
