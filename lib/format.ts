/**
 * Formatting for amounts, caps and ledger-based time.
 *
 * The contracts schedule in ledgers, not wall-clock time. Ledgers close about
 * every five seconds, so every duration shown here is an estimate and is
 * worded as one ("about 1 day"). Amounts are bigint raw units throughout and
 * are only turned into decimal strings at the edge.
 */

import { formatDuration, intervalToDuration, type Duration } from "date-fns";

/** Approximate seconds per ledger on Stellar. */
export const LEDGER_SECONDS = 5;

export interface IntervalPreset {
  label: string;
  ledgers: number;
}

/** Common billing intervals, expressed in ledgers at ~5s each. */
export const INTERVAL_PRESETS: IntervalPreset[] = [
  { label: "Hourly", ledgers: 720 },
  { label: "Daily", ledgers: 17_280 },
  { label: "Weekly", ledgers: 120_960 },
  { label: "Every 30 days", ledgers: 518_400 },
];

const pow10 = (decimals: number): bigint => 10n ** BigInt(decimals);

/**
 * Raw units to a grouped decimal string, trailing zeros trimmed:
 * `formatAmount(12_500_000n, 7)` → `"1.25"`.
 */
export function formatAmount(value: bigint, decimals: number, maxFraction = decimals): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const scale = pow10(decimals);
  const whole = abs / scale;
  let fraction = (abs % scale).toString().padStart(decimals, "0").slice(0, maxFraction);
  fraction = fraction.replace(/0+$/, "");
  const grouped = whole.toLocaleString("en-US");
  return `${negative ? "-" : ""}${grouped}${fraction ? `.${fraction}` : ""}`;
}

export function formatToken(value: bigint, symbol: string, decimals: number): string {
  return `${formatAmount(value, decimals)} ${symbol}`;
}

/**
 * A user-typed decimal amount to raw units. Returns null for anything that is
 * not a positive number with at most `decimals` fraction digits.
 */
export function parseAmount(input: string, decimals: number): bigint | null {
  const trimmed = input.trim().replace(/,/g, "");
  const match = /^(\d+)(?:\.(\d*))?$/.exec(trimmed);
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  if (fraction.length > decimals) return null;
  const raw = BigInt(whole) * pow10(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
  return raw > 0n ? raw : null;
}

/** The most charges a cap allows. The contract rejects any charge beyond it. */
export function maxCharges(cap: bigint, amountPerPeriod: bigint): bigint {
  if (amountPerPeriod <= 0n) return 0n;
  return cap / amountPerPeriod;
}

/**
 * Cap left over after the last whole charge. The contract can never charge
 * it, because a charge is always exactly one period's amount.
 */
export function unchargeableRemainder(cap: bigint, amountPerPeriod: bigint): bigint {
  if (amountPerPeriod <= 0n) return 0n;
  return cap % amountPerPeriod;
}

/** Share of the cap charged so far, 0–100, to two decimal places. */
export function capPercent(charged: bigint, cap: bigint): number {
  if (cap <= 0n) return 0;
  const bounded = charged > cap ? cap : charged < 0n ? 0n : charged;
  return Number((bounded * 10_000n) / cap) / 100;
}

function durationFromLedgers(ledgers: number): Duration {
  return intervalToDuration({ start: 0, end: Math.max(0, ledgers) * LEDGER_SECONDS * 1000 });
}

/** The two most significant units, e.g. "1 day 4 hours" or "25 minutes". */
function twoUnits(duration: Duration): string {
  const units: (keyof Duration)[] = ["years", "months", "days", "hours", "minutes", "seconds"];
  const present = units.filter((u) => (duration[u] ?? 0) > 0).slice(0, 2);
  return formatDuration(duration, { format: present.length ? present : ["seconds"], zero: !present.length });
}

/** "about 1 day" for 17,280 ledgers. */
export function approxDuration(ledgers: number): string {
  return `about ${twoUnits(durationFromLedgers(ledgers))}`;
}

/**
 * How often a plan bills, in plain words: "every hour", "every day", or
 * "about every 3 days 4 hours" for intervals that are not a preset.
 */
export function describeInterval(ledgers: number): string {
  const preset: Record<number, string> = {
    720: "every hour",
    17_280: "every day",
    120_960: "every week",
    518_400: "every 30 days",
  };
  return preset[ledgers] ?? `about every ${twoUnits(durationFromLedgers(ledgers))}`;
}

/** Ledger count with grouping: "17,280 ledgers". */
export function formatLedgers(ledgers: number): string {
  return `${ledgers.toLocaleString("en-US")} ${ledgers === 1 ? "ledger" : "ledgers"}`;
}

/** "GABC…WXYZ" */
export function shortAddress(address: string, keep = 4): string {
  if (address.length <= keep * 2 + 1) return address;
  return `${address.slice(0, keep)}…${address.slice(-keep)}`;
}

export function pluralize(count: bigint | number, singular: string, plural = `${singular}s`): string {
  const n = typeof count === "bigint" ? count : BigInt(count);
  return `${n.toLocaleString("en-US")} ${n === 1n ? singular : plural}`;
}
