"use client";

import { createContext, useContext } from "react";
import type { WriteCtx } from "@/lib/stellar";
import type { Network, TxPhase } from "@/types";

export interface WalletState {
  /** Connected Freighter account, or null. */
  address: string | null;
  /** Network the app reads from and writes to. */
  network: Network;
  /** Network Freighter is set to; null if unknown or not Testnet/Mainnet. */
  walletNetwork: Network | null;
  installed: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  /** Choose the browsing network. Only applies while disconnected. */
  setNetwork: (network: Network) => void;
  /** A write context for the connected account. Throws a readable error if writes aren't possible. */
  writeCtx: (onPhase?: (phase: TxPhase) => void) => WriteCtx;
}

export const WalletContext = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const wallet = useContext(WalletContext);
  if (!wallet) throw new Error("useWallet must be used inside <WalletProvider>.");
  return wallet;
}
