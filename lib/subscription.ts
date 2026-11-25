/**
 * Derived facts about a subscription, computed the way the contract computes
 * them so the UI never claims more (or less) than the contract allows.
 */

import { maxCharges } from "@/lib/format";
import { SubStatus, type Subscription } from "@/types";

/**
 * Whether the subscription has reached a final state.
 *
 * Returns `true` when the status is `Cancelled` or `Exhausted`, `false`
 * otherwise. Assumes `status` is one of the known `SubStatus` values.
 * Mirrors the contract's rule that a cancelled or exhausted subscription can
 * never be charged again.
 */
export function isFinal(sub: Pick<Subscription, "status">): boolean {
  return sub.status === SubStatus.Cancelled || sub.status === SubStatus.Exhausted;
}

/**
 * Cap that can still be charged in principle.
 *
 * Returns `totalCap - totalCharged`, or `0n` once the subscription is final
 * (cancelled or exhausted). Assumes `totalCharged` never exceeds `totalCap`.
 * Mirrors the contract's remaining-capacity computation, which reports zero
 * for final subscriptions.
 */
export function remainingCap(sub: Subscription): bigint {
  return isFinal(sub) ? 0n : sub.totalCap - sub.totalCharged;
}

/**
 * Whole charges the cap still has room for.
 *
 * Returns the number of full periods the remaining cap can fund, computed via
 * `maxCharges(remainingCap, amountPerPeriod)`. Assumes `amountPerPeriod` is
 * non-zero. Mirrors the contract's rule that only whole periods can be
 * charged, so any leftover smaller than one period is ignored.
 */
export function chargesLeft(sub: Subscription): bigint {
  return maxCharges(remainingCap(sub), sub.amountPerPeriod);
}

/**
 * The most this subscription can still take from the subscriber.
 *
 * Returns `chargesLeft * amountPerPeriod`. Every charge is exactly one
 * period's amount, so a leftover smaller than a period can never be charged
 * and is not counted. Assumes `amountPerPeriod` is non-zero. Mirrors the
 * contract's rule that only whole periods are chargeable.
 */
export function remainingChargeable(sub: Subscription): bigint {
  return chargesLeft(sub) * sub.amountPerPeriod;
}

/**
 * Ledgers until a charge is allowed.
 *
 * Returns `nextChargeLedger - currentLedger`; zero or negative means a charge
 * is allowed now. Assumes both values are ledger sequence numbers. Mirrors the
 * contract's rule that a charge is only permitted once `nextChargeLedger` has
 * been reached.
 */
export function ledgersUntilNextCharge(sub: Subscription, currentLedger: number): number {
  return sub.nextChargeLedger - currentLedger;
}

/**
 * Whether the ledger clock alone rules a charge in: the subscription is live
 * (active, not final) and its next charge ledger has been reached. This is a
 * cheap pre-filter only — the contract's `is_chargeable` remains the final
 * authority.
 */
export function isDueByLedger(sub: Subscription, currentLedger: number): boolean {
  return sub.status === SubStatus.Active && ledgersUntilNextCharge(sub, currentLedger) <= 0;
}

/**
 * Subscriptions that may be chargeable right now. Rows that are clearly not
 * due (paused, final, or whose next charge ledger is still in the future) are
 * filtered out by the shared ledger value and never sent to the contract.
 * The remainder is confirmed with `isChargeable` (the contract's
 * `is_chargeable`), which stays the final authority.
 */
export function dueSubscriptions(
  subs: Subscription[],
  currentLedger: number,
  isChargeable: (sub: Subscription) => boolean,
): Subscription[] {
  return subs.filter((sub) => isDueByLedger(sub, currentLedger) && isChargeable(sub));
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

/** Live subscriptions first (active, then paused), then ended ones, soonest charge first. */
export function sortForDisplay(subs: Subscription[]): Subscription[] {
  const rank = (s: Subscription) => (s.status === SubStatus.Active ? 0 : s.status === SubStatus.Paused ? 1 : 2);
  return [...subs].sort((a, b) => rank(a) - rank(b) || a.nextChargeLedger - b.nextChargeLedger);
}
