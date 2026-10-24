"use client";

import { useAsync } from "@/hooks/useAsync";
import { useWallet } from "@/hooks/useWallet";
import { getSubscription, getSubscriptionsByMerchant, getSubscriptionsBySubscriber } from "@/lib/contracts";

/**
 * Cache keys for subscription reads. `useAsync` applies stale-while-revalidate
 * semantics: cached data is shown immediately on back-navigation and refreshed
 * quietly in the background. Writes must invalidate these keys so stale data is
 * never shown after a mutation.
 */
export const subscriptionCacheKeys = {
  bySubscriber: (network: string, subscriber: string) =>
    `subscriptions:subscriber:${network}:${subscriber}`,
  byMerchant: (network: string, merchant: string) =>
    `subscriptions:merchant:${network}:${merchant}`,
  one: (network: string, id: number) => `subscription:${network}:${id}`,
};

/** Subscriptions owned by `subscriber`; idle without a connected account. */
export function useSubscriptions(subscriber: string | null) {
  const { network } = useWallet();
  return useAsync(
    subscriber ? () => getSubscriptionsBySubscriber(network, subscriber) : null,
    [network, subscriber],
    subscriber ? { cacheKey: subscriptionCacheKeys.bySubscriber(network, subscriber) } : undefined,
  );
}

/** Subscriptions payable to `merchant`; idle without a connected account. */
export function useMerchantSubscriptions(merchant: string | null) {
  const { network } = useWallet();
  return useAsync(
    merchant ? () => getSubscriptionsByMerchant(network, merchant) : null,
    [network, merchant],
    merchant ? { cacheKey: subscriptionCacheKeys.byMerchant(network, merchant) } : undefined,
  );
}

/** One subscription, read fresh from the contract. */
export function useSubscription(id: number | null) {
  const { network } = useWallet();
  return useAsync(
    id === null ? null : () => getSubscription(network, id),
    [network, id],
    id === null ? undefined : { cacheKey: subscriptionCacheKeys.one(network, id) },
  );
}
