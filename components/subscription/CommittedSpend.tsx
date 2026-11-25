import { committedByToken } from "@/lib/subscription";
import { useToken } from "@/hooks/useToken";
import { formatToken } from "@/lib/format";
import type { Subscription } from "@/types";

/**
 * The most your active and paused subscriptions can still take, per token.
 * Amounts in different tokens are never added together.
 */
export function CommittedSpend({ subs }: { subs: Subscription[] }) {
  const totals = [...committedByToken(subs)];

  return (
    <section aria-labelledby="committed-heading" className="card space-y-2 p-5">
      <h2 id="committed-heading" className="text-sm font-medium text-muted">
        Total committed spend
      </h2>
      {totals.length === 0 ? (
        <p className="text-fg">Nothing — no live subscription has any cap left.</p>
      ) : (
        <ul className="flex flex-wrap gap-x-8 gap-y-1">
          {totals.map(([token, total]) => (
            <CommittedSpendRow key={token} token={token} value={total} />
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">
        The most that can still be charged across your active and paused subscriptions, if every one were charged at
        every opportunity. It&apos;s a ceiling, not a bill — you can lower it any time by pausing or cancelling.
      </p>
    </section>
  );
}

function CommittedSpendRow({ token, value }: { token: string; value: bigint }) {
  const { data, isLoading, isError } = useToken(token);

  if (isLoading) {
    return (
      <li className="text-2xl font-semibold text-fg">
        <span className="text-muted" aria-busy="true">
          Loading…
        </span>
      </li>
    );
  }

  if (isError || !data) {
    return (
      <li className="text-2xl font-semibold text-fg">
        <span className="text-muted" role="alert">
          Unable to load token
        </span>
      </li>
    );
  }

  return (
    <li className="text-2xl font-semibold text-fg">
      {formatToken(value, data.symbol, data.decimals)}
    </li>
  );
}