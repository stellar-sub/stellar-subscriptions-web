"use client";

import { useEffect, useState } from "react";
import { isAccountFunded, getFriendbotUrl } from "@/lib/stellar-account";
import { useWallet } from "@/hooks/useWallet";

/**
 * Display a warning if connected on Testnet with an unfunded account.
 * Offer a Friendbot button to fund the account, or explain that Mainnet
 * accounts must be funded with real XLM.
 */
export function AccountFundingStatus() {
  const { address, network } = useWallet();
  const [funded, setFunded] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!address) {
      setFunded(null);
      return;
    }

    setChecking(true);
    void (async () => {
      try {
        const isFunded = await isAccountFunded(address, network);
        setFunded(isFunded);
      } catch (err) {
        console.error("Failed to check account funding status:", err);
        setFunded(null);
      } finally {
        setChecking(false);
      }
    })();
  }, [address, network]);

  if (!address || funded === true || funded === null) {
    return null;
  }

  return (
    <div className="rounded-lg border border-warn/30 bg-warn/10 p-4 space-y-3">
      <p className="text-sm text-warn font-semibold">Account not funded</p>

      {network === "testnet" ? (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            Your Testnet account needs to be funded before you can transact. Use Friendbot below.
          </p>
          <a
            href={getFriendbotUrl(address)}
            target="_blank"
            rel="noreferrer"
            className="btn-primary inline-block text-sm py-2 px-3"
          >
            Fund with Friendbot
          </a>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Mainnet accounts must be funded with real XLM before you can transact. You can purchase XLM
          from an exchange or transfer from another account.
        </p>
      )}
    </div>
  );
}
