"use client";

import { useAsync } from "@/hooks/useAsync";
import { useWallet } from "@/hooks/useWallet";
import { getTokenBalance, getTokenInfo } from "@/lib/contracts";

/** Symbol, name and decimals of a token contract. Cached across components. */
export function useToken(token: string | undefined) {
  const { network } = useWallet();
  return useAsync(token ? () => getTokenInfo(network, token) : null, [network, token]);
}

/** `owner`'s balance of `token`; idle until both are known. */
export function useTokenBalance(token: string | undefined, owner: string | null) {
  const { network } = useWallet();
  return useAsync(
    token && owner ? () => getTokenBalance(network, token, owner) : null,
    [network, token, owner],
  );
}
