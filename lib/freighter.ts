/**
 * Thin wrapper over @stellar/freighter-api.
 *
 * Freighter returns `{ ..., error }` objects instead of throwing. These
 * helpers turn those into thrown `WalletError`s with messages a person can
 * act on, and map the wallet's network passphrase onto our `Network` union.
 */

import {
  getAddress,
  getNetworkDetails,
  isAllowed,
  isConnected,
  requestAccess,
  signTransaction,
  WatchWalletChanges,
} from "@stellar/freighter-api";
import { Networks } from "@stellar/stellar-sdk";
import type { Network } from "@/types";

export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletError";
  }
}

/** Freighter errors are strings or `{ message, code }` objects. */
function walletMessage(error: unknown, fallback: string): string {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  if (/declin|reject|denied|cancel/i.test(raw)) {
    return "You declined the request in Freighter. Nothing was signed or sent.";
  }
  return raw || fallback;
}

export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const res = await isConnected();
    return Boolean(res.isConnected);
  } catch {
    return false;
  }
}

/** Whether this site already has access, without prompting. */
export async function hasAccess(): Promise<boolean> {
  try {
    const res = await isAllowed();
    return Boolean(res.isAllowed);
  } catch {
    return false;
  }
}

/** Ask the user to connect and return their address. */
export async function connect(): Promise<string> {
  if (!(await isFreighterInstalled())) {
    throw new WalletError(
      "Freighter isn't installed. Get it at freighter.app, then reload this page.",
    );
  }
  const res = await requestAccess();
  if (res.error) throw new WalletError(walletMessage(res.error, "Couldn't connect to Freighter."));
  if (!res.address) throw new WalletError("Freighter didn't return an account.");
  return res.address;
}

/** The connected address, or null, without prompting. */
export async function currentAddress(): Promise<string | null> {
  if (!(await hasAccess())) return null;
  try {
    const res = await getAddress();
    return res.error || !res.address ? null : res.address;
  } catch {
    return null;
  }
}

/** The network Freighter is pointed at, or null if it is neither of ours. */
export async function walletNetwork(): Promise<Network | null> {
  try {
    const res = await getNetworkDetails();
    if (res.error) return null;
    if (res.networkPassphrase === Networks.TESTNET) return "testnet";
    if (res.networkPassphrase === Networks.PUBLIC) return "mainnet";
    return null;
  } catch {
    return null;
  }
}

/** Ask Freighter to sign a transaction envelope; returns the signed XDR. */
export async function signWithFreighter(
  xdr: string,
  networkPassphrase: string,
  address: string,
): Promise<string> {
  const res = await signTransaction(xdr, { networkPassphrase, address });
  if (res.error) throw new WalletError(walletMessage(res.error, "Freighter couldn't sign."));
  if (!res.signedTxXdr) throw new WalletError("Freighter returned no signature.");
  return res.signedTxXdr;
}

/**
 * Poll Freighter for account or network changes (it has no push events).
 * Returns a function that stops watching.
 */
export function watchWallet(
  onChange: (change: { address: string; networkPassphrase: string }) => void,
  intervalMs = 5000,
): () => void {
  try {
    const watcher = new WatchWalletChanges(intervalMs);
    watcher.watch(onChange);
    return () => watcher.stop();
  } catch {
    return () => {};
  }
}
