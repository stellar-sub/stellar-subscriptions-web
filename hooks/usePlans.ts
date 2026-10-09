"use client";

import { useAsync } from "@/hooks/useAsync";
import { useWallet } from "@/hooks/useWallet";
import { getActivePlans, getPlan, getPlansByMerchant } from "@/lib/contracts";

/** Every plan currently accepting subscribers. */
export function usePlans() {
  const { network } = useWallet();
  return useAsync(() => getActivePlans(network), [network]);
}

/** One plan by id; idle while `id` is null. */
export function usePlan(id: number | null) {
  const { network } = useWallet();
  return useAsync(id === null ? null : () => getPlan(network, id), [network, id]);
}

/** Every plan a merchant published, active or not; idle without a merchant. */
export function useMerchantPlans(merchant: string | null) {
  const { network } = useWallet();
  return useAsync(merchant ? () => getPlansByMerchant(network, merchant) : null, [network, merchant]);
}
