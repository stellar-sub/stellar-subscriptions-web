"use client";

import { useAsync } from "@/hooks/useAsync";
import { useWallet } from "@/hooks/useWallet";
import { getSubscription, getSubscriptionsByMerchant, getSubscriptionsBySubscriber } from "@/lib/contracts";

/** How long cached subscription data is considered fresh before a revalidation is forced. */
const SUBSCRIPTIONS_TTL_MS = 30_000;

type CacheEntry<T> = { data: T; updatedAt: number };

const SUBSCRIPTIONS_CACHE = new Map<string, CacheEntry<unknown>>();
const SUBSCRIPTIONS_INFLIGHT = new Map<string, Promise<unknown>>();

function cacheKey(scope: string, network: string, id: string | number): string {
  return `${scope}:${network}:${id}`;
}

function readCache<T>(key: string): T | undefined {
  const entry = SUBSCRIPTIONS_CACHE.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.updatedAt > SUBSCRIPTIONS_TTL_MS) return undefined;
  return entry.data as T;
}

function writeCache<T>(key: string, data: T): void {
  SUBSCRIPTIONS_CACHE.set(key, { data, updatedAt: Date.now() });
}

function fetchOnce<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const existing = SUBSCRIPTIONS_INFLIGHT.get(key);
  if (existing) return existing as Promise<T>;
  const promise = fetcher().finally(() => {
    SUBSCRIPTIONS_INFLIGHT.delete(key);
  });
  SUBSCRIPTIONS_INFLIGHT.set(key, promise);
  return promise;
}

/** Clears all cached subscription data and any in-flight requests. */
export function invalidateSubscriptions(): void {
  SUBSCRIPTIONS_CACHE.clear();
  SUBSCRIPTIONS_INFLIGHT.clear();
}

/** Subscriptions owned by `subscriber`; idle without a connected account. */
export function useSubscriptions(subscriber: string | null) {
  const { network } = useWallet();
  const key = subscriber ? cacheKey("subscriber", network, subscriber) : null;
  return useAsync(
    subscriber && key
      ? () => fetchOnce(key, () => getSubscriptionsBySubscriber(network, subscriber))
      : null,
    [network, subscriber],
    key
      ? {
          cacheKey: key,
          readCache: <T>() => readCache<T>(key),
          writeCache: <T>(data: T) => writeCache(key, data),
        }
      : undefined,
  );
}

/** Subscriptions payable to `merchant`; idle without a connected account. */
export function useMerchantSubscriptions(merchant: string | null) {
  const { network } = useWallet();
  const key = merchant ? cacheKey("merchant", network, merchant) : null;
  return useAsync(
    merchant && key
      ? () => fetchOnce(key, () => getSubscriptionsByMerchant(network, merchant))
      : null,
    [network, merchant],
    key
      ? {
          cacheKey: key,
          readCache: <T>() => readCache<T>(key),
          writeCache: <T>(data: T) => writeCache(key, data),
        }
      : undefined,
  );
}

/** One subscription, read fresh from the contract. */
export function useSubscription(id: number | null) {
  const { network } = useWallet();
  const key = id === null ? null : cacheKey("subscription", network, id);
  return useAsync(
    id !== null && key ? () => fetchOnce(key, () => getSubscription(network, id)) : null,
    [network, id],
    key
      ? {
          cacheKey: key,
          readCache: <T>() => readCache<T>(key),
          writeCache: <T>(data: T) => writeCache(key, data),
        }
      : undefined,
  );
}