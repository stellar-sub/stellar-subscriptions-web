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
 * The user's locale, resolved once. Falls back to `en-US` when the runtime
 * cannot report one (e.g. some server contexts).
 */
function resolveLocale(): string {
  try {
    return new Intl.NumberFormat().resolvedOptions().locale || "en-US";
  } catch {
    return "en-US";
  }
}

const LOCALE = resolveLocale();

/**
 * Group an integer digit string with the locale's grouping separator, without
 * ever routing the value through a floating-point number.
 */
function groupDigits(digits: string, locale: string): string {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234567890);
  const group = parts.find((p) => p.type === "group")?.value ?? ",";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, group);
}

/** The locale's decimal separator, e.g. "." or ",". */
function decimalSeparator(locale: string): string {
  const parts = new Intl.NumberFormat(locale).formatToParts(1.5);
  return parts.find((p) => p.type === "decimal")?.value ?? ".";
}

/**
 * Raw units to a grouped decimal string, trailing zeros trimmed:
 * `formatAmount(12_500_000n, 7)` → `"1.25"` (or `"1,25"` in `de-DE`).
 *
 * Grouping and the decimal separator follow the user's locale, but the value
 * is computed entirely in bigint so it never loses precision.
 */
export function formatAmount(value: bigint, decimals: number, maxFraction = decimals): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const scale = pow10(decimals);
  const whole = abs / scale;
  let fraction = (abs % scale).toString().padStart(decimals, "0").slice(0, maxFraction);
  fraction = fraction.replace(/0+$/, "");
  const grouped = groupDigits(whole.toString(), LOCALE);
  const sep = decimalSeparator(LOCALE);
  return `${negative ? "-" : ""}${grouped}${fraction ? `${sep}${fraction}` : ""}`;
}

export function formatToken(value: bigint, symbol: string, decimals: number): string {
  return `${formatAmount(value, decimals)} ${symbol}`;
}

/**
 * The exact raw-unit integer as a string, with no grouping and no float math:
 * `rawAmount(12_500_000n)` → `"12500000"`. Use this for CSV exports so the
 * value a spreadsheet sees is exactly the on-chain amount.
 */
export function rawAmount(value: bigint): string {
  return value.toString();
}

/**
 * An amount with its token symbol and decimals for display, keeping every
 * fraction digit the token has (no trimming): `formatTokenExact(12_500_000n,
 * "USDC", 7)` → `"1.2500000 USDC"`. Amounts in different tokens are never
 * combined; call this once per token.
 */
export function formatTokenExact(value: bigint, symbol: string, decimals: number): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const scale = pow10(decimals);
  const whole = (abs / scale).toLocaleString("en-US");
  const fraction = (abs % scale).toString().padStart(decimals, "0");
  return `${negative ? "-" : ""}${whole}${decimals > 0 ? `.${fraction}` : ""} ${symbol}`;
}

/**
 * A UTC day bucket key, `YYYY-MM-DD`, from a `Date`. Buckets are UTC so the
 * same event always lands in the same day regardless of the viewer's zone.
 */
export function dayKey(date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * A user-typed decimal amount to raw units. Returns null for anything that is
 * not a positive number with at most `decimals` fraction digits. Accepts both
 * `,` and `.` as the decimal separator and ignores grouping separators.
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
 * An estimated wall-clock date for a ledger difference, in the user's local
 * time zone. Ledgers close at roughly five seconds each, so the result is
 * always approximate and callers must label it as an estimate.
 *
 * `formatEstimatedDate(17_280)` → `"Jan 2, 2025, 3:45 PM"` (local time).
 */
export function formatEstimatedDate(ledgers: number, from: Date = new Date()): string {
  const target = new Date(from.getTime() + Math.max(0, ledgers) * LEDGER_SECONDS * 1000);
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(target);
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
  return `${ledgers.toLocaleString(LOCALE)} ${ledgers === 1 ? "ledger" : "ledgers"}`;
}

/** "GABC…WXYZ" */
export function shortAddress(address: string, keep = 4): string {
  if (address.length <= keep * 2 + 1) return address;
  return `${address.slice(0, keep)}…${address.slice(-keep)}`;
}

export function pluralize(count: bigint | number, singular: string, plural = `${singular}s`): string {
  const n = typeof count === "bigint" ? count : BigInt(count);
  return `${n.toLocaleString(LOCALE)} ${n === 1n ? singular : plural}`;
}

/** Cost normalized to 30 days for easy comparison across different billing intervals. */
export function normalizeTo30Days(amountPerPeriod: bigint, intervalLedgers: number): bigint {
  if (intervalLedgers <= 0 || amountPerPeriod <= 0n) return 0n;
  const THIRTY_DAYS_LEDGERS = 518_400;
  return (BigInt(THIRTY_DAYS_LEDGERS) * amountPerPeriod) / BigInt(intervalLedgers);
}

/** Validate a Stellar public key (account address). */
export function isValidStellarAddress(address: string): boolean {
  if (typeof address !== "string") return false;
  try {
    const { StrKey } = require("@stellar/stellar-sdk");
    return StrKey.isValidEd25519PublicKey(address);
  } catch {
    return false;
  }
}
