import { SorobanRpc } from "@stellar/stellar-sdk";
import { NETWORKS, type Network } from "@/lib/stellar";

/**
 * Check if an account exists on the given network by attempting to fetch its details.
 */
export async function isAccountFunded(address: string, network: Network): Promise<boolean> {
  const server = new SorobanRpc.Server(NETWORKS[network].rpcUrl);
  try {
    await server.getAccount(address);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/account.*not.*exist|account.*not.*found/i.test(message)) {
      return false;
    }
    throw err;
  }
}

/**
 * Get the Friendbot URL for funding a Testnet account.
 */
export function getFriendbotUrl(address: string): string {
  return `https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`;
}
