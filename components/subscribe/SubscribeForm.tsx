"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useTokenBalance } from "@/hooks/useToken";
import { useTx } from "@/hooks/useTx";
import { useWallet } from "@/hooks/useWallet";
import { subscribe } from "@/lib/contracts";
import { formatAmount } from "@/lib/format";
import { TxProgress } from "@/components/ui/TxProgress";
import type { Plan, TokenInfo } from "@/types";
import { AuthorizationSummary } from "./AuthorizationSummary";
import { CapSelector, type CapChoice } from "./CapSelector";

/**
 * Subscribe to a plan: choose a cap, read exactly what it authorizes, confirm
 * you understand, then sign once in Freighter.
 */
export function SubscribeForm({ plan, token }: { plan: Plan; token: TokenInfo }) {
  const { address, network, connect, installed } = useWallet();
  const tx = useTx();
  const [choice, setChoice] = useState<CapChoice>({ cap: plan.defaultCap, error: null });
  const [understood, setUnderstood] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<number | null>(null);
  const balance = useTokenBalance(plan.token, address);

  const onCapChange = useCallback((next: CapChoice) => {
    setChoice(next);
    setUnderstood(false);
  }, []);

  if (!plan.active) {
    return (
      <div className="card p-5 text-sm text-muted">
        This plan is closed to new subscribers. Anyone already subscribed keeps exactly the terms they authorized.
      </div>
    );
  }

  if (address === plan.merchant) {
    return (
      <div className="card p-5 text-sm text-muted">
        This is your own plan. Subscribers will see the form here.{" "}
        <Link href="/merchant" className="text-brand hover:underline">
          Go to your dashboard
        </Link>
      </div>
    );
  }

  if (subscriptionId !== null) {
    return (
      <div className="card space-y-4 p-5">
        <TxProgress
          phase={tx.phase}
          hash={tx.hash}
          error={tx.error}
          network={network}
          successText={`Subscribed — subscription #${subscriptionId} is active.`}
        />
        <p className="text-sm text-muted">
          You can pause or cancel it any time from My subscriptions. After you cancel, no further charges can occur.
        </p>
        <Link href="/subscriptions" className="btn-primary">
          Go to My subscriptions
        </Link>
      </div>
    );
  }

  const short = balance.data !== undefined && balance.data < plan.amountPerPeriod;
  const canConfirm = Boolean(address) && choice.cap !== null && understood && !tx.pending;

  async function confirm() {
    if (choice.cap === null) return;
    const cap = choice.cap;
    const result = await tx.run((ctx) =>
      subscribe(ctx, {
        merchant: plan.merchant,
        token: plan.token,
        amountPerPeriod: plan.amountPerPeriod,
        intervalLedgers: plan.intervalLedgers,
        totalCap: cap,
        planId: plan.id,
      }),
    );
    if (result) setSubscriptionId(result.id);
  }

  return (
    <div className="space-y-5">
      <CapSelector
        amountPerPeriod={plan.amountPerPeriod}
        defaultCap={plan.defaultCap}
        token={token}
        onChange={onCapChange}
      />

      {choice.cap !== null && (
        <AuthorizationSummary
          merchant={plan.merchant}
          amountPerPeriod={plan.amountPerPeriod}
          intervalLedgers={plan.intervalLedgers}
          cap={choice.cap}
          token={token}
        />
      )}

      {short && balance.data !== undefined && (
        <p role="status" className="rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
          Your balance is {formatAmount(balance.data, token.decimals)} {token.symbol}, less than one charge. You can
          still subscribe, but charges will fail — and nothing will be taken — until you hold enough.
        </p>
      )}

      {choice.cap !== null && (
        <label className="flex items-start gap-3 text-sm text-fg">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[rgb(var(--brand))]"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
          />
          <span>I&apos;ve read what I&apos;m authorizing above.</span>
        </label>
      )}

      {address ? (
        <button type="button" className="btn-primary w-full py-3" disabled={!canConfirm} onClick={() => void confirm()}>
          {tx.pending ? "Subscribing…" : "Authorize and subscribe"}
        </button>
      ) : installed ? (
        <button type="button" className="btn-primary w-full py-3" onClick={() => void connect()}>
          Connect wallet to subscribe
        </button>
      ) : (
        <a href="https://freighter.app" target="_blank" rel="noreferrer" className="btn-primary w-full py-3">
          Install Freighter to subscribe
        </a>
      )}

      <TxProgress
        phase={tx.phase}
        hash={tx.hash}
        error={tx.error}
        network={network}
        successText="Subscribed."
        onDismiss={tx.reset}
      />
    </div>
  );
}
