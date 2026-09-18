"use client";

import { useWallet } from "@/hooks/useWallet";
import { contractsFor } from "@/lib/contracts";
import { NETWORKS } from "@/lib/stellar";

/**
 * A banner for the two situations where actions can't work: Freighter is on
 * a network we don't support, or the chosen network has no deployment.
 */
export function NetworkNotice() {
  const { address, walletNetwork, network } = useWallet();

  let message: string | null = null;
  if (address && !walletNetwork) {
    message = "Freighter is set to a network this app doesn't support. Switch it to Testnet to subscribe or charge.";
  } else if (!contractsFor(network)) {
    message = `Stellar Subscriptions isn't deployed on ${NETWORKS[network].label} yet. ${
      address ? "Switch Freighter to Testnet" : "Choose Testnet"
    } to use the live deployment.`;
  }

  if (!message) return null;
  return (
    <div role="status" className="border-b border-warn/30 bg-warn/10 px-4 py-2 text-center text-sm text-warn">
      {message}
    </div>
  );
}
