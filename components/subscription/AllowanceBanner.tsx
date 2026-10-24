"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useAsync } from "@/hooks/useAsync";
import { getSubscriptionAllowance, refreshAllowance } from "@/lib/contracts";
import { formatAmount } from "@/lib/format";
import type { Subscription } from "@/types";

export function AllowanceBanner({ subs }: { subs: Subscription[] }) {
  const { address, network } = useWallet();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Group subscriptions by token and calculate total needed
  const tokenNeeds = subs.reduce(
    (acc, sub) => {
      if (!acc[sub.token]) acc[sub.token] = 0n;
      acc[sub.token] += sub.amountPerPeriod;
      return acc;
    },
    {} as Record<string, bigint>,
  );

  const allowances = useAsync(
    address && subs.length > 0
      ? async () => {
          const result: Record<string, bigint> = {};
          for (const token of Object.keys(tokenNeeds)) {
            try {
              const allowance = await getSubscriptionAllowance(network, token, address);
              result[token] = allowance;
            } catch {
              result[token] = 0n;
            }
          }
          return result;
        }
      : null,
    [address, network, subs.length],
  );

  const insufficientTokens = Object.entries(tokenNeeds).filter(
    ([token, needed]) => (allowances.data?.[token] || 0n) < needed,
  );

  if (insufficientTokens.length === 0) return null;

  const handleRefresh = async () => {
    if (!address) return;
    setIsRefreshing(true);
    try {
      for (const [token] of insufficientTokens) {
        await refreshAllowance(network, token, address);
      }
      allowances.reload();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-2 rounded border border-warn/30 bg-warn/10 p-4">
      <h3 className="font-medium text-warn">Token allowance expired or insufficient</h3>
      <p className="text-sm text-warn">
        {insufficientTokens.length === 1
          ? `Your allowance for ${insufficientTokens[0][0]} is too low. `
          : `Your allowances for ${insufficientTokens.map(([t]) => t).join(", ")} are too low. `}
        Charges may fail until you refresh it.
      </p>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="mt-2 rounded bg-warn px-3 py-2 text-sm font-medium text-warn-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isRefreshing ? "Refreshing..." : "Refresh allowance"}
      </button>
    </div>
  );
}
