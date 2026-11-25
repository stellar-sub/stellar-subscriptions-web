"use client";

import { useEffect, useMemo, useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { useWallet } from "@/hooks/useWallet";
import { useMerchantSubscriptions } from "@/hooks/useSubscriptions";
import { getChargeEvents, getTokenInfo } from "@/lib/contracts";
import { formatToken, pluralize, shortAddress } from "@/lib/format";
import { summarizeChargedToday } from "@/lib/charges";
import type { ChargeEvent, Subscription } from "@/types";

export interface TokenMetadata {
  symbol: string;
  decimals: number;
}

export interface ChargedTodayProps {
  events: readonly ChargeEvent[];
  /** Token contract id for each subscription id, since events omit the token. */
  tokenBySubscription?: ReadonlyMap<number, string>;
  /** Symbol and decimals per token contract id, used to format the totals. */
  tokens?: Readonly<Record<string, TokenMetadata>>;
  /** The day to report on; defaults to today. */
  now?: Date;
  loading?: boolean;
  error?: unknown;
}

const NO_EVENTS: readonly ChargeEvent[] = [];
const NO_SUBSCRIPTIONS: readonly Subscription[] = [];

/**
 * "X charges today" plus the total charged per token, filtered from the
 * merchant's recent `charged` events. Rendering only: pass the events in.
 */
export function ChargedToday({
  events,
  tokenBySubscription,
  tokens = {},
  now,
  loading = false,
  error = null,
}: ChargedTodayProps) {
  const summary = useMemo(
    () => summarizeChargedToday(events, { now, tokenBySubscription }),
    [events, now, tokenBySubscription],
  );

  return (
    <section aria-labelledby="charged-today-heading" className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 id="charged-today-heading" className="text-lg font-semibold">
        Charged today
      </h2>

      {loading ? (
        <p className="mt-1 text-sm text-gray-600">Loading charges…</p>
      ) : error ? (
        <p className="mt-1 text-sm text-red-600">Could not load charges today.</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-600">{pluralize(summary.count, "charge")} today</p>

          {summary.totals.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {summary.totals.map(({ token, amount }) => {
                const metadata = tokens[token];
                return (
                  <li key={token} className="flex items-center justify-between gap-4">
                    <span className="font-medium">Total charged</span>
                    <span className="tabular-nums">
                      {metadata
                        ? formatToken(amount, metadata.symbol, metadata.decimals)
                        : `${amount.toString()} raw units (${shortAddress(token, 4)})`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/**
 * Fetches the merchant's recent charges and the token metadata needed to
 * total them, then renders {@link ChargedToday}.
 */
export function MerchantChargedToday({ merchant }: { merchant: string | null }) {
  const { network } = useWallet();
  const { data: subscriptions } = useMerchantSubscriptions(merchant);
  const charges = useAsync(merchant ? () => getChargeEvents(network, merchant) : null, [network, merchant]);

  const events = charges.data?.events ?? NO_EVENTS;

  const tokenBySubscription = useMemo(() => {
    const map = new Map<number, string>();
    for (const subscription of subscriptions ?? NO_SUBSCRIPTIONS) {
      map.set(subscription.id, subscription.token);
    }
    return map;
  }, [subscriptions]);

  const tokenIds = useMemo(() => {
    const ids = new Set<string>(tokenBySubscription.values());
    return [...ids].sort();
  }, [tokenBySubscription]);

  const [tokens, setTokens] = useState<Record<string, TokenMetadata>>({});

  useEffect(() => {
    if (tokenIds.length === 0) {
      setTokens((previous) => (Object.keys(previous).length === 0 ? previous : {}));
      return;
    }

    let cancelled = false;
    Promise.all(
      tokenIds.map(async (token) => {
        try {
          const info = await getTokenInfo(network, token);
          return [token, { symbol: info.symbol, decimals: info.decimals }] as const;
        } catch {
          // Keep the raw amount visible rather than hiding the row.
          return null;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setTokens(
        Object.fromEntries(entries.filter((entry): entry is readonly [string, TokenMetadata] => entry !== null)),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [network, tokenIds]);

  return (
    <ChargedToday
      events={events}
      tokenBySubscription={tokenBySubscription}
      tokens={tokens}
      loading={charges.loading}
      error={charges.error}
    />
  );
}
