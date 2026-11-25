"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useAsync } from "@/hooks/useAsync";
import { getSubscriptionAllowance } from "@/lib/contracts";
import { useToken, useTokenBalance } from "@/hooks/useToken";
import { Spinner } from "@/components/ui/Spinner";
import { TokenAmount } from "@/components/ui/TokenAmount";
import { SubStatus, type Subscription } from "@/types";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Deduplicate token contract IDs from a list of active subscriptions. */
function activeTokens(subs: Subscription[]): string[] {
  const seen = new Set<string>();
  for (const sub of subs) {
    if (sub.status === SubStatus.Active) seen.add(sub.token);
  }
  return Array.from(seen);
}

// ── per-token row ─────────────────────────────────────────────────────────────

function TokenRow({ token, owner }: { token: string; owner: string }) {
  const { data: info } = useToken(token);
  const balance = useTokenBalance(token, owner);
  const { address, network } = useWallet();
  const allowance = useAsync(
    address ? () => getSubscriptionAllowance(network, token, address) : null,
    [network, token, address],
  );

  const symbol = info?.symbol ?? "…";

  return (
    <li className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="font-medium">{symbol}</span>
      <span className="flex gap-6 tabular-nums text-muted">
        <span>
          <span className="sr-only">Balance: </span>
          {balance.loading ? (
            <Spinner className="inline-flex h-3 w-3" />
          ) : balance.error ? (
            <span className="text-danger" title="Failed to load balance">—</span>
          ) : balance.data !== undefined ? (
            <TokenAmount token={token} value={balance.data} />
          ) : (
            "—"
          )}
        </span>
        <span>
          <span className="sr-only">Allowance: </span>
          {allowance.loading ? (
            <Spinner className="inline-flex h-3 w-3" />
          ) : allowance.error ? (
            <span className="text-danger" title="Failed to load allowance">—</span>
          ) : allowance.data !== undefined ? (
            <TokenAmount token={token} value={allowance.data} />
          ) : (
            "—"
          )}
        </span>
      </span>
    </li>
  );
}

// ── main component ────────────────────────────────────────────────────────────

/**
 * Collapsible wallet panel showing the balance and subscription-contract
 * allowance for every token used by the subscriber's active subscriptions.
 * Idle (renders nothing) when no wallet is connected.
 */
export function WalletPanel() {
  const { address } = useWallet();
  const subs = useSubscriptions(address);
  const [open, setOpen] = useState(false);

  // Stay invisible while disconnected.
  if (!address) return null;

  const tokens = subs.data ? activeTokens(subs.data) : [];

  return (
    <section
      aria-label="Wallet"
      className="rounded-lg border border-border bg-card text-fg shadow-sm"
    >
      {/* Header / toggle */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="wallet-panel-body"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      >
        <span>Wallet</span>
        <span aria-hidden="true" className="text-muted">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Collapsible body */}
      {open && (
        <div id="wallet-panel-body" className="px-4 pb-4">
          {subs.loading && (
            <div className="flex justify-center py-4">
              <Spinner label="Loading subscriptions…" />
            </div>
          )}

          {subs.error && (
            <p role="alert" className="py-2 text-sm text-danger">
              Could not load subscriptions.
            </p>
          )}

          {!subs.loading && !subs.error && tokens.length === 0 && (
            <p className="py-2 text-sm text-muted">No active subscriptions.</p>
          )}

          {tokens.length > 0 && (
            <>
              {/* Column headers */}
              <div
                aria-hidden="true"
                className="flex justify-between pb-1 text-xs font-medium text-muted"
              >
                <span>Token</span>
                <span className="flex gap-6">
                  <span>Balance</span>
                  <span>Allowance</span>
                </span>
              </div>
              <ul aria-label="Token balances and allowances" className="divide-y divide-border">
                {tokens.map((token) => (
                  <TokenRow key={token} token={token} owner={address} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
