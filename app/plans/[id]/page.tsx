"use client";

import Link from "next/link";
import { usePlan } from "@/hooks/usePlans";
import { useToken } from "@/hooks/useToken";
import { NotDeployedError } from "@/lib/contracts";
import { approxDuration, describeInterval, formatLedgers, maxCharges, pluralize } from "@/lib/format";
import { ErrorState } from "@/components/ui/ErrorState";
import { Spinner } from "@/components/ui/Spinner";
import { TokenAmount } from "@/components/ui/TokenAmount";
import { PlanBadge } from "@/components/plan/PlanBadge";
import { SubscribeForm } from "@/components/subscribe/SubscribeForm";
import { useWallet } from "@/hooks/useWallet";
import { explorerAccountUrl, explorerContractUrl } from "@/lib/stellar";

export function sanitizePlanName(name: string): string {
  return name.replace(/[<>]/g, "");
}

export default function PlanDetailPage({ params }: { params: { id: string } }) {
  const id = /^\d+$/.test(params.id) ? Number(params.id) : null;
  const plan = usePlan(id);
  const token = useToken(plan.data?.token ?? undefined);
  const { network } = useWallet();

  if (id === null) {
    return <ErrorState error={new Error(`"${params.id}" isn't a plan number.`)} title="Plan not found" />;
  }
  if (plan.error instanceof NotDeployedError) {
    return (
      <div className="space-y-4">
        <Link href="/plans" className="text-sm text-muted hover:text-fg">← All plans</Link>
        <div className="card space-y-3 p-6">
          <h1 className="text-2xl font-semibold text-fg">Not deployed on mainnet yet</h1>
          <p className="text-sm text-muted">
            This plan can&apos;t be loaded because the contracts aren&apos;t deployed on mainnet yet.
          </p>
          <Link href="/plans" className="inline-block text-sm font-medium text-accent hover:underline">Browse plans on testnet →</Link>
        </div>
      </div>
    );
  }
  if (plan.error) return <ErrorState error={plan.error} title="Couldn't load this plan" onRetry={plan.reload} />;
  if (!plan.data) return <div className="flex justify-center p-10"><Spinner /></div>;

  const p = plan.data;
  return (
    <div className="space-y-6">
      <Link href="/plans" className="text-sm text-muted hover:text-fg">← All plans</Link>
      <div className="grid gap-8 lg:grid-cols-[1fr_28rem]">
        <section className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-fg">{sanitizePlanName(p.name)}</h1>
              <PlanBadge active={p.active} />
            </div>
            <p className="text-sm text-muted">
              Plan #{p.id} · merchant{" "}
              <a href={explorerAccountUrl(network, p.merchant)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{p.merchant}</a>
            </p>
          </div>
          <p className="text-4xl font-semibold text-fg">
            <TokenAmount token={p.token} value={p.amountPerPeriod} />
            <span className="ml-2 text-base font-normal text-muted">{describeInterval(p.intervalLedgers)}</span>
          </p>
          <dl className="card divide-y divide-line text-sm">
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted">Amount per charge</dt>
              <dd className="text-fg"><TokenAmount token={p.token} value={p.amountPerPeriod} /></dd>
            </div>
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted">Billing interval</dt>
              <dd className="text-right text-fg">
                {approxDuration(p.intervalLedgers)}
                <span className="block text-xs text-muted">{formatLedgers(p.intervalLedgers)}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted">Suggested cap</dt>
              <dd className="text-right text-fg">
                <TokenAmount token={p.token} value={p.defaultCap} />
                <span className="block text-xs text-muted">at most {pluralize(maxCharges(p.defaultCap, p.amountPerPeriod), "charge")}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted">Token</dt>
              <dd className="text-right text-fg">
                {token.data ? `${token.data.symbol} · ${token.data.name}` : "…"}
                <span className="block">
                  <a href={explorerContractUrl(network, p.token)} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{p.token}</a>
                </span>
              </dd>
            </div>
          </dl>
          <p className="text-sm text-muted">The merchant can charge at most once per interval and never more than the cap you choose.</p>
        </section>
        <aside className="space-y-4">
          <h2 className="text-lg font-semibold text-fg">Subscribe</h2>
          {!p.active ? (
            <div className="card p-5 text-sm text-muted">This plan is closed to new subscribers.</div>
          ) : token.error ? (
            <ErrorState error={token.error} title="Couldn't read this plan's token" onRetry={token.reload} />
          ) : token.data ? (
            <SubscribeForm plan={p} token={token.data} />
          ) : (
            <div className="flex justify-center p-10"><Spinner /></div>
          )}
        </aside>
      </div>
    </div>
  );
}
