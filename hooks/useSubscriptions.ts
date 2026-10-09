"use client";

import { useAsync } from "@/hooks/useAsync";
import { useWallet } from "@/hooks/useWallet";
import { getSubscription, getSubscriptionsByMerchant, getSubscriptionsBySubscriber } from "@/lib/contracts";

/** Subscriptions owned by `subscriber`; idle without a connected account. */
export function useSubscriptions(subscriber: string | null) {
  const { network } = useWallet();
  return useAsync(
    subscriber ? () => getSubscriptionsBySubscriber(network, subscriber) : null,
    [network, subscriber],
  );
}

/** Subscriptions payable to `merchant`; idle without a connected account. */
export function useMerchantSubscriptions(merchant: string | null) {
  const { network } = useWallet();
  return useAsync(
    merchant ? () => getSubscriptionsByMerchant(network, merchant) : null,
    [network, merchant],
  );
}

/** One subscription, read fresh from the contract. */
export function useSubscription(id: number | null) {
  const { network } = useWallet();
  return useAsync(id === null ? null : () => getSubscription(network, id), [network, id]);
}
