export type HealthScore = "good" | "at-risk" | "critical";

/** Alias kept for compatibility with components that import HealthLevel. */
export type HealthLevel = HealthScore;

export interface Subscription {
  id: string;
  amount: number;
  currency?: string;
  status?: string;
}

export interface Balance {
  currency: string;
  amount: number;
}

export interface Allowance {
  currency: string;
  amount: number;
}

const LIVE_STATUSES = new Set(["active", "live", "trialing"]);

function isLive(sub: Subscription): boolean {
  if (!sub.status) return true;
  return LIVE_STATUSES.has(sub.status.toLowerCase());
}

function getBalanceFor(
  balances: Balance[],
  currency: string | undefined
): number | undefined {
  if (!currency) {
    return balances.length > 0 ? balances[0].amount : undefined;
  }
  const match = balances.find(
    (b) => b.currency.toLowerCase() === currency.toLowerCase()
  );
  return match ? match.amount : undefined;
}

function getAllowanceFor(
  allowances: Allowance[],
  currency: string | undefined
): number | undefined {
  if (!currency) {
    return allowances.length > 0 ? allowances[0].amount : undefined;
  }
  const match = allowances.find(
    (a) => a.currency.toLowerCase() === currency.toLowerCase()
  );
  return match ? match.amount : undefined;
}

export function scoreHealth(
  subs: Subscription[],
  balances: Balance[],
  allowances: Allowance[]
): HealthScore {
  const liveSubs = subs.filter(isLive);

  if (liveSubs.length === 0) {
    return "good";
  }

  let atRisk = false;

  for (const sub of liveSubs) {
    const balance = getBalanceFor(balances, sub.currency);
    const allowance = getAllowanceFor(allowances, sub.currency);

    // Critical: zero allowance for this subscription's currency.
    if (allowance !== undefined && allowance <= 0) {
      return "critical";
    }

    // Critical: insufficient balance for the next charge.
    if (balance !== undefined && balance < sub.amount) {
      return "critical";
    }

    // At-risk: balance covers fewer than 3 charges.
    if (balance !== undefined && sub.amount > 0) {
      const chargesCovered = balance / sub.amount;
      if (chargesCovered < 3) {
        atRisk = true;
      }
    }
  }

  return atRisk ? "at-risk" : "good";
}
