"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  connect as freighterConnect,
  currentAddress,
  isFreighterInstalled,
  signWithFreighter,
  walletNetwork as freighterNetwork,
  watchWallet,
} from "@/lib/freighter";
import { DEFAULT_NETWORK, NETWORKS, type WriteCtx } from "@/lib/stellar";
import { WalletContext, type WalletState } from "@/hooks/useWallet";
import type { Network, TxPhase } from "@/types";

const REMEMBER_KEY = "subs.wallet.connected";

/**
 * Holds the Freighter connection. While connected the app follows the
 * wallet's network, so what you see and what you sign always agree; while
 * disconnected you can browse either network read-only.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetworkState] = useState<Network>(DEFAULT_NETWORK);
  const [walletNetwork, setWalletNetwork] = useState<Network | null>(null);
  const [installed, setInstalled] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addressRef = useRef<string | null>(null);
  addressRef.current = address;

  const followWallet = useCallback(async () => {
    const detected = await freighterNetwork();
    setWalletNetwork(detected);
    if (detected) setNetworkState(detected);
  }, []);

  // Detect Freighter and quietly restore a previous connection.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const present = await isFreighterInstalled();
      if (cancelled) return;
      setInstalled(present);
      if (!present || !localStorage.getItem(REMEMBER_KEY)) return;
      const existing = await currentAddress();
      if (cancelled) return;
      if (existing) {
        setAddress(existing);
        await followWallet();
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [followWallet]);

  // Follow account and network switches made inside Freighter. Freighter
  // has no push events, so this polls, and stops while the tab is hidden.
  useEffect(() => {
    if (!installed) return;
    let stop: (() => void) | null = null;
    const start = () => {
      stop ??= watchWallet(({ address: next }) => {
        if (!addressRef.current) return;
        if (next && next !== addressRef.current) setAddress(next);
        void followWallet();
      });
    };
    const pause = () => {
      stop?.();
      stop = null;
    };
    const onVisibility = () => (document.hidden ? pause() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      pause();
    };
  }, [installed, followWallet]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const connected = await freighterConnect();
      setAddress(connected);
      localStorage.setItem(REMEMBER_KEY, "1");
      await followWallet();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't connect to Freighter.");
    } finally {
      setConnecting(false);
    }
  }, [followWallet]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setWalletNetwork(null);
    localStorage.removeItem(REMEMBER_KEY);
  }, []);

  const setNetwork = useCallback((next: Network) => {
    if (!addressRef.current) setNetworkState(next);
  }, []);

  const writeCtx = useCallback(
    (onPhase?: (phase: TxPhase) => void): WriteCtx => {
      const source = addressRef.current;
      if (!source) throw new Error("Connect your Freighter wallet first.");
      if (!walletNetwork) {
        throw new Error("Switch Freighter to Testnet or Mainnet, then try again.");
      }
      return {
        network,
        source,
        sign: (xdr) => signWithFreighter(xdr, NETWORKS[network].passphrase, source),
        onPhase,
      };
    },
    [network, walletNetwork],
  );

  const value = useMemo<WalletState>(
    () => ({
      address,
      network,
      walletNetwork,
      installed,
      connecting,
      error,
      connect,
      disconnect,
      setNetwork,
      writeCtx,
    }),
    [address, network, walletNetwork, installed, connecting, error, connect, disconnect, setNetwork, writeCtx],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
