// Storybook stand-in for lib/stellar: the ledger is pinned so countdowns render
// the same way every time instead of waiting on the network.
export * from "../../lib/stellar";

export async function getLatestLedger(): Promise<number> {
  return 1_000;
}
