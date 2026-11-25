/**
 * Summaries built from `charged` contract events.
 *
 * A `Charged` event carries the subscription id but not its token, so callers
 * that want a per-token total pass a subscription-to-token lookup alongside
 * the events (see `getChargeEvents` and `getSubscriptionsByMerchant`).
 */

import { dayKey } from "@/lib/format";
import type { ChargeEvent } from "@/types";

export interface ChargedTodayOptions {
  /** The moment "today" is measured against; defaults to now. */
  now?: Date;
  /** Token contract id for each subscription id. */
  tokenBySubscription?: ReadonlyMap<number, string>;
}

export interface TokenChargeTotal {
  /** Token contract id, or `"unknown"` when no subscription matched. */
  token: string;
  amount: bigint;
}

export interface ChargedTodaySummary {
  count: number;
  totals: TokenChargeTotal[];
}

/**
 * The charge events that closed today. Days are UTC buckets (`dayKey`), so an
 * event always lands in the same day regardless of the viewer's time zone.
 */
export function chargesToday(events: readonly ChargeEvent[], now: Date = new Date()): ChargeEvent[] {
  const today = dayKey(now);
  return events.filter((event) => dayKey(event.closedAt) === today);
}

/** How many charges happened today, and the total amount per token. */
export function summarizeChargedToday(
  events: readonly ChargeEvent[],
  { now = new Date(), tokenBySubscription }: ChargedTodayOptions = {},
): ChargedTodaySummary {
  const today = chargesToday(events, now);

  const totals = new Map<string, bigint>();
  for (const event of today) {
    const token = tokenBySubscription?.get(event.subscriptionId) ?? "unknown";
    totals.set(token, (totals.get(token) ?? 0n) + event.amount);
  }

  return {
    count: today.length,
    totals: [...totals.entries()]
      .map(([token, amount]) => ({ token, amount }))
      .sort((a, b) => a.token.localeCompare(b.token)),
  };
}
