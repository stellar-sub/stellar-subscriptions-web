"use client";

import { useWallet } from "@/hooks/useWallet";
import { contractsFor } from "@/lib/contracts";
import { NETWORKS } from "@/lib/stellar";
import type { Network } from "@/types";

const OPTIONS: Network[] = ["testnet", "mainnet"];

/**
 * Choose which network to browse. While a wallet is connected the app
 * follows Freighter instead, so what you see always matches what you sign.
 */
export function NetworkSelector() {
  const { address, network, setNetwork } = useWallet();
  const locked = Boolean(address);

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="sr-only">Network</span>
      <select
        value={network}
        disabled={locked}
        onChange={(e) => setNetwork(e.target.value as Network)}
        title={locked ? "Follows your Freighter network while connected" : "Network to browse"}
        className="input w-auto py-1.5 disabled:opacity-80"
      >
        {OPTIONS.map((n) => (
          <option key={n} value={n}>
            {NETWORKS[n].label}
            {contractsFor(n) ? "" : " (not deployed)"}
          </option>
        ))}
      </select>
    </label>
  );
}
