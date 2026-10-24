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
  let action: { label: string; onClick: () => void } | null = null;

  if (address && !walletNetwork) {
    message = "Freighter is set to a network this app doesn't support.";
    action = {
      label: "Switch to Testnet",
      onClick: () => {
        window.open("https://docs.freighter.app/", "_blank");
      },
    };
  } else if (!contractsFor(network)) {
    message = `Stellar Subscriptions isn't deployed on ${NETWORKS[network].label} yet.`;
    action = {
      label: address ? "Switch Freighter to Testnet" : "Choose Testnet",
      onClick: () => {
        window.open("https://docs.freighter.app/", "_blank");
      },
    };
  }

  if (!message) return null;
  return (
    <div role="status" className="border-b border-warn/30 bg-warn/10 px-4 py-2 text-center text-sm text-warn">
      <p className="mb-2">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-block rounded bg-warn px-3 py-1 text-xs font-medium text-warn-foreground hover:opacity-90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
