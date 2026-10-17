'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAsync } from '@/lib/hooks/useAsync';
import { getChargeEvents, getTokenInfo, type ChargeEvent } from '@/lib/contracts';
import { formatAmount } from '@/lib/format';
import { LoadingBlock } from '@/components/ui/LoadingBlock';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';

/**
 * Estimated average ledger close time in seconds (Stellar: ~5s).
 * Used only to derive an approximate date for the history window.
 */
const SECONDS_PER_LEDGER = 5;

export interface RevenueChartProps {
  network: string;
  merchant: string;
}

interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
}

interface DayBucket {
  /** UTC day key, e.g. "2024-05-01" */
  day: string;
  /** Raw amount as bigint, summed strictly within one token */
  amount: bigint;
}

interface TokenSeries {
  token: TokenInfo;
  buckets: DayBucket[];
  total: bigint;
}

function utcDayKey(timestampSeconds: number): string {
  const d = new Date(timestampSeconds * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function estimateLedgerDate(fromLedger: number, currentLedger: number): Date | null {
  if (!Number.isFinite(fromLedger) || !Number.isFinite(currentLedger)) {
    return null;
  }
  const ledgersAgo = Math.max(0, currentLedger - fromLedger);
  const secondsAgo = ledgersAgo * SECONDS_PER_LEDGER;
  return new Date(Date.now() - secondsAgo * 1000);
}

function formatEstimate(date: Date | null): string {
  if (!date) return 'unknown';
  return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

export function RevenueChart({ network, merchant }: RevenueChartProps) {
  const {
    data: chargeResult,
    loading,
    error,
  } = useAsync(
    () => getChargeEvents(network, merchant),
    [network, merchant],
  );

  const events: ChargeEvent[] = chargeResult?.events ?? [];
  const fromLedger: number | undefined = chargeResult?.fromLedger;
  const currentLedger: number | undefined = chargeResult?.currentLedger;

  // Distinct token addresses, strictly grouped.
  const tokenAddresses = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) {
      set.add(ev.token);
    }
    return Array.from(set).sort();
  }, [events]);

  const {
    data: tokenInfos,
    loading: tokensLoading,
    error: tokensError,
  } = useAsync(
    async () => {
      const infos = await Promise.all(
        tokenAddresses.map(async (address) => {
          const info = await getTokenInfo(network, address);
          return {
            address,
            symbol: info.symbol,
            decimals: info.decimals,
          } satisfies TokenInfo;
        }),
      );
      return infos;
    },
    [network, tokenAddresses.join(',')],
  );

  const series: TokenSeries[] = useMemo(() => {
    if (!tokenInfos) return [];
    const infoByAddress = new Map<string, TokenInfo>();
    for (const info of tokenInfos) {
      infoByAddress.set(info.address, info);
    }

    // Group events strictly by token address.
    const byToken = new Map<string, Map<string, bigint>>();
    for (const ev of events) {
      const day = utcDayKey(ev.timestamp);
      let days = byToken.get(ev.token);
      if (!days) {
        days = new Map<string, bigint>();
        byToken.set(ev.token, days);
      }
      const prev = days.get(day) ?? 0n;
      days.set(day, prev + ev.amount);
    }

    const result: TokenSeries[] = [];
    for (const [address, days] of byToken) {
      const info = infoByAddress.get(address);
      if (!info) continue;
      const buckets: DayBucket[] = Array.from(days.entries())
        .map(([day, amount]) => ({ day, amount }))
        .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
      const total = buckets.reduce((acc, b) => acc + b.amount, 0n);
      result.push({ token: info, buckets, total });
    }
    result.sort((a, b) => (a.token.symbol < b.token.symbol ? -1 : 1));
    return result;
  }, [events, tokenInfos]);

  // Union of all days across tokens, for the shared X axis.
  const allDays = useMemo(() => {
    const set = new Set<string>();
    for (const s of series) {
      for (const b of s.buckets) set.add(b.day);
    }
    return Array.from(set).sort();
  }, [series]);

  // Chart data: one row per day, one key per token (never summed together).
  const chartData = useMemo(() => {
    return allDays.map((day) => {
      const row: Record<string, string | number> = { day };
      for (const s of series) {
        const bucket = s.buckets.find((b) => b.day === day);
        row[s.token.address] = bucket
          ? Number(formatAmount(bucket.amount, s.token.decimals, { plain: true }))
          : 0;
      }
      return row;
    });
  }, [allDays, series]);

  const isLoading = loading || tokensLoading;
  const anyError = error ?? tokensError;

  const estimatedDate = useMemo(() => {
    if (fromLedger === undefined || currentLedger === undefined) return null;
    return estimateLedgerDate(fromLedger, currentLedger);
  }, [fromLedger, currentLedger]);

  const historyNotice = (
    <div
      role="note"
      className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <p className="font-medium">Charge history covers only recent ledgers.</p>
      <p className="mt-1">
        Data starts from ledger{' '}
        <span className="font-mono">
          {fromLedger !== undefined ? fromLedger.toLocaleString() : 'unknown'}
        </span>
        {estimatedDate ? (
          <>
            {' '}
            (estimated start date:{' '}
            <span className="font-mono">{formatEstimate(estimatedDate)}</span> — this
            date is an estimate based on average ledger close times, not an exact
            timestamp)
          </>
        ) : null}
        . RPC nodes keep only a limited window of events, so an empty or partial chart
        does not mean there was no revenue. Older history requires an indexer.
      </p>
    </div>
  );

  return (
    <section className="space-y-4" aria-labelledby="revenue-chart-heading">
      <h2 id="revenue-chart-heading" className="text-lg font-semibold">
        Revenue
      </h2>

      {historyNotice}

      {isLoading ? (
        <LoadingBlock label="Loading charge history…" />
      ) : anyError ? (
        <ErrorState
          title="Could not load revenue"
          message={anyError instanceof Error ? anyError.message : String(anyError)}
        />
      ) : events.length === 0 || series.length === 0 ? (
        <EmptyState
          title="No charges in the available history"
          description="No charge events were found in the recent ledger window. This does not necessarily mean there was no revenue — older history requires an indexer."
        />
      ) : (
        <>
          {/* Per-token totals — never combined across tokens. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {series.map((s) => (
              <div
                key={s.token.address}
                className="rounded-md border border-gray-200 p-3"
              >
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Total ({s.token.symbol})
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {formatAmount(s.total, s.token.decimals)} {s.token.symbol}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {s.token.decimals} decimals · {s.token.address.slice(0, 6)}…
                  {s.token.address.slice(-4)}
                </p>
              </div>
            ))}
          </div>

          <div className="h-72 w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                {series.map((s) => (
                  <Bar
                    key={s.token.address}
                    dataKey={s.token.address}
                    name={s.token.symbol}
                    fill={colorForToken(s.token.address)}
                    stackId={undefined}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Accessible text/table alternative to the chart. */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <caption className="sr-only">
                Charges per day, grouped by token. Amounts in different tokens are
                never added together.
              </caption>
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th scope="col" className="py-2 pr-4">
                    Token
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    Day (UTC)
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {series.flatMap((s) =>
                  s.buckets.map((b) => (
                    <tr
                      key={`${s.token.address}-${b.day}`}
                      className="border-b border-gray-100"
                    >
                      <td className="py-2 pr-4">
                        {s.token.symbol}{' '}
                        <span className="text-xs text-gray-500">
                          ({s.token.decimals} decimals)
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-mono">{b.day}</td>
                      <td className="py-2 pr-4">
                        {formatAmount(b.amount, s.token.decimals)} {s.token.symbol}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
              <tfoot>
                {series.map((s) => (
                  <tr key={`total-${s.token.address}`} className="font-semibold">
                    <td className="py-2 pr-4" colSpan={2}>
                      Total ({s.token.symbol})
                    </td>
                    <td className="py-2 pr-4">
                      {formatAmount(s.total, s.token.decimals)} {s.token.symbol}
                    </td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>

          <p className="text-xs text-gray-500">
            Charges shown are limited to the contract&apos;s cap and schedule; the
            contract forbids charging more than the cap or off schedule.
          </p>
        </>
      )}
    </section>
  );
}

function colorForToken(address: string): string {
  const palette = [
    '#2563eb',
    '#16a34a',
    '#d97706',
    '#dc2626',
    '#7c3aed',
    '#0891b2',
    '#db2777',
    '#65a30d',
  ];
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

export default RevenueChart;