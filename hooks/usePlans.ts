"use client";

import { useAsync } from "@/hooks/useAsync";
import { useWallet } from "@/hooks/useWallet";
import { getActivePlans, getPlan, getPlansByMerchant } from "@/lib/contracts";

/**
 * Stale-while-revalidate cache for plan reads.
 *
 * Entries are keyed by network + query so back-navigation renders the last
 * known value immediately while a quiet background refresh runs. Writes must
 * call `invalidatePlans` so stale data is never shown after a mutation.
 */
type PlanCacheEntry = {
  data: unknown;
  updatedAt: number;
};

const PLAN_CACHE = new Map<string, PlanCacheEntry>();
const PLAN_TTL_MS = 30_000;

/** In-flight reads keyed by cache key so concurrent prefetch + mount dedupe. */
const PLAN_INFLIGHT = new Map<string, Promise<unknown>>();

function cacheKey(network: string, scope: string): string {
  return `${network}:${scope}`;
}

function readCache<T>(key: string): { data: T; stale: boolean } | null {
  const entry = PLAN_CACHE.get(key);
  if (!entry) return null;
  return { data: entry.data as T, stale: Date.now() - entry.updatedAt > PLAN_TTL_MS };
}

function writeCache(key: string, data: unknown): void {
  PLAN_CACHE.set(key, { data, updatedAt: Date.now() });
}

/**
 * Fetch a plan once and share the result with any concurrent caller.
 * Repeated prefetches (hover + focus) reuse the in-flight promise or the
 * fresh cache entry instead of issuing another request.
 */
function fetchPlanOnce(network: string, id: number): Promise<unknown> {
  const key = cacheKey(network, `plan:${id}`);
  const cached = readCache(key);
  if (cached && !cached.stale) return Promise.resolve(cached.data);

  const inflight = PLAN_INFLIGHT.get(key);
  if (inflight) return inflight;

  const request = getPlan(network, id)
    .then((data) => {
      writeCache(key, data);
      return data;
    })
    .finally(() => {
      PLAN_INFLIGHT.delete(key);
    });

  PLAN_INFLIGHT.set(key, request);
  return request;
}

/** Drop cached plan reads; call after any plan write. */
export function invalidatePlans(): void {
  PLAN_CACHE.clear();
  PLAN_INFLIGHT.clear();
}

/**
 * Warm the plan cache ahead of navigation (e.g. on card hover/focus).
 * Safe to call repeatedly: fresh cache entries and in-flight requests are
 * reused, so no request is repeated.
 */
export function prefetchPlan(network: string, id: number): void {
  void fetchPlanOnce(network, id).catch(() => {
    /* prefetch is best-effort; the detail page will retry on mount */
  });
}

/** Every plan currently accepting subscribers. */
export function usePlans() {
  const { network } = useWallet();
  const key = cacheKey(network, "active");
  return useAsync(() => getActivePlans(network), [network], {
    cacheKey: key,
    readCache,
    writeCache,
  });
}

/** One plan by id; idle while `id` is null. */
export function usePlan(id: number | null) {
  const { network } = useWallet();
  const key = id === null ? null : cacheKey(network, `plan:${id}`);
  return useAsync(id === null ? null : () => fetchPlanOnce(network, id), [network, id], {
    cacheKey: key,
    readCache,
    writeCache,
  });
}

/** Every plan a merchant published, active or not; idle without a merchant. */
export function useMerchantPlans(merchant: string | null) {
  const { network } = useWallet();
  const key = merchant ? cacheKey(network, `merchant:${merchant}`) : null;
  return useAsync(merchant ? () => getPlansByMerchant(network, merchant) : null, [network, merchant], {
    cacheKey: key,
    readCache,
    writeCache,
  });
}
