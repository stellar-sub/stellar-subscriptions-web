/**
 * Derived facts about a subscription, computed the way the contract computes
 * them so the UI never claims more (or less) than the contract allows.
 */

import { maxCharges } from "@/lib/format";
import { SubStatus, type Subscription } from "@/types";

export function isFinal(sub: Pick<Subscription, "status">): boolean {
  return sub.status === SubStatus.Cancelled || sub.status === SubStatus.Exhausted;
}

/** Cap that can still be charged in principle: 0 once cancelled or exhausted. */
export function remainingCap(sub: Subscription): bigint {
  return isFinal(sub) ? 0n : sub.totalCap - sub.totalCharged;
}

/** Whole charges the cap still has room for. */
export function chargesLeft(sub: Subscription): bigint {
  return maxCharges(remainingCap(sub), sub.amountPerPeriod);
}

/**
 * The most this subscription can still take from the subscriber. Every
 * charge is exactly one period's amount, so a leftover smaller than a period
 * can never be charged and is not counted.
 */
export function remainingChargeable(sub: Subscription): bigint {
  return chargesLeft(sub) * sub.amountPerPeriod;
}

/** Ledgers until a charge is allowed; zero or negative means allowed now. */
export function ledgersUntilNextCharge(sub: Subscription, currentLedger: number): number {
  return sub.nextChargeLedger - currentLedger;
}

/** Sum a list of subscriptions' remaining chargeable amounts, per token. */
export function committedByToken(subs: Subscription[]): Map<string, bigint> {
  const totals = new Map<string, bigint>();
  for (const sub of subs) {
    const left = remainingChargeable(sub);
    if (left > 0n) totals.set(sub.token, (totals.get(sub.token) ?? 0n) + left);
  }
  return totals;
}

/** Live subscriptions first (active, then paused), then ended ones, newest first. */
export function sortForDisplay(subs: Subscription[]): Subscription[] {
  const rank = (s: Subscription) => (s.status === SubStatus.Active ? 0 : s.status === SubStatus.Paused ? 1 : 2);
  return [...subs].sort((a, b) => rank(a) - rank(b) || b.id - a.id);
}
