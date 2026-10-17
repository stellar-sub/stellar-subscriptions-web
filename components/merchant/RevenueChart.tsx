'use client';

import { useMemo, useState } from 'react';

export interface ChargeEvent {
  id?: string;
  ledger: number;
  timestamp: number | string;
  subscriptionId: string;
  token: string;
  amount: string | number;
  txHash: string;
}

export interface MerchantSubscription {
  id: string;
  planId?: string | null;
}

export interface MerchantPlan {
  id: string;
  name: string;
}

export interface RevenueChartProps {
  chargeEvents: ChargeEvent[];
  subscriptions: MerchantSubscription[];
  plans: MerchantPlan[];
  explorerUrl?: (txHash: string) => string;
  className?: string;
}

interface PlanTokenAggregate {
  planId: string;
  planName: string;
  token: string;
  total: number;
  count: number;
}

const NO_PLAN_KEY = '__no_plan__';
const NO_PLAN_LABEL = 'No plan';

function toNumber(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString(undefined, { maximumFractionDigits: 7 });
}

function formatTimestamp(value: number | string): string {
  let date: Date;
  if (typeof value === 'number') {
    // Heuristic: values below ~year 2001 in ms are likely seconds.
    const ms = value < 1e12 ? value * 1000 : value;
    date = new Date(ms);
  } else {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    } else {
      const numeric = Number(value);
      date = new Date(numeric < 1e12 ? numeric * 1000 : numeric);
    }
  }
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function RevenueChart({
  chargeEvents,
  subscriptions,
  plans,
  explorerUrl,
  className,
}: RevenueChartProps) {
  const [exporting, setExporting] = useState(false);

  const subscriptionToPlan = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const sub of subscriptions) {
      map.set(sub.id, sub.planId ?? null);
    }
    return map;
  }, [subscriptions]);

  const planNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const plan of plans) {
      map.set(plan.id, plan.name);
    }
    return map;
  }, [plans]);

  const { perPlan, perTokenTotals, grandTotal } = useMemo(() => {
    const aggregate = new Map<string, PlanTokenAggregate>();
    const tokenTotals = new Map<string, number>();
    let total = 0;

    for (const event of chargeEvents) {
      const amount = toNumber(event.amount);
      const token = event.token || 'UNKNOWN';
      const planId = subscriptionToPlan.get(event.subscriptionId) ?? null;
      const bucketKey = planId ?? NO_PLAN_KEY;
      const planName = planId ? planNames.get(planId) ?? planId : NO_PLAN_LABEL;

      const key = `${bucketKey}::${token}`;
      const existing = aggregate.get(key);
      if (existing) {
        existing.total += amount;
        existing.count += 1;
      } else {
        aggregate.set(key, {
          planId: bucketKey,
          planName,
          token,
          total: amount,
          count: 1,
        });
      }

      tokenTotals.set(token, (tokenTotals.get(token) ?? 0) + amount);
      total += amount;
    }

    const rows = Array.from(aggregate.values()).sort((a, b) => {
      if (a.planId === NO_PLAN_KEY && b.planId !== NO_PLAN_KEY) return 1;
      if (b.planId === NO_PLAN_KEY && a.planId !== NO_PLAN_KEY) return -1;
      if (a.planName !== b.planName) return a.planName.localeCompare(b.planName);
      return a.token.localeCompare(b.token);
    });

    return {
      perPlan: rows,
      perTokenTotals: Array.from(tokenTotals.entries()).sort((a, b) =>
        a[0].localeCompare(b[0]),
      ),
      grandTotal: total,
    };
  }, [chargeEvents, subscriptionToPlan, planNames]);

  const ledgerRange = useMemo(() => {
    if (chargeEvents.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const event of chargeEvents) {
      if (typeof event.ledger === 'number' && Number.isFinite(event.ledger)) {
        if (event.ledger < min) min = event.ledger;
        if (event.ledger > max) max = event.ledger;
      }
    }
    if (min === Infinity || max === -Infinity) return null;
    return { min, max };
  }, [chargeEvents]);

  const handleExport = () => {
    if (exporting) return;
    setExporting(true);
    try {
      const lines: string[] = [];
      const rangeText = ledgerRange
        ? `ledger ${ledgerRange.min} to ${ledgerRange.max}`
        : 'no ledger range (no charge events)';
      lines.push(`# Charge history export - ${rangeText}`);
      lines.push(
        ['ledger', 'timestamp', 'subscription_id', 'token', 'amount', 'tx_hash', 'tx_url']
          .map(escapeCsv)
          .join(','),
      );

      const sorted = [...chargeEvents].sort((a, b) => {
        if (a.ledger !== b.ledger) return a.ledger - b.ledger;
        return formatTimestamp(a.timestamp).localeCompare(formatTimestamp(b.timestamp));
      });

      for (const event of sorted) {
        const url = explorerUrl ? explorerUrl(event.txHash) : '';
        lines.push(
          [
            String(event.ledger),
            formatTimestamp(event.timestamp),
            event.subscriptionId,
            event.token,
            String(event.amount),
            event.txHash,
            url,
          ]
            .map((v) => escapeCsv(v))
            .join(','),
        );
      }

      const csv = lines.join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const rangeSuffix = ledgerRange
        ? `ledger-${ledgerRange.min}-${ledgerRange.max}`
        : 'no-ledger-range';
      link.href = objectUrl;
      link.download = `charge-history-${rangeSuffix}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={className}>
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.75rem',
            }}
          >
            <h3 style={{ margin: 0 }}>Revenue</h3>
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || chargeEvents.length === 0}
              aria-label="Export charge history to CSV"
            >
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', opacity: 0.8 }}>
            {ledgerRange
              ? `Ledger range: ${ledgerRange.min} – ${ledgerRange.max}`
              : 'No charge events loaded.'}
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {perTokenTotals.length === 0 ? (
              <li style={{ opacity: 0.7 }}>No revenue recorded.</li>
            ) : (
              perTokenTotals.map(([token, total]) => (
                <li key={token} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{token}</span>
                  <strong>{formatAmount(total)}</strong>
                </li>
              ))
            )}
          </ul>
        </div>

        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 0.75rem' }}>Revenue by plan</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }}>Plan</th>
                <th style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }}>Token</th>
                <th style={{ textAlign: 'right', padding: '0.25rem 0.5rem' }}>Charges</th>
                <th style={{ textAlign: 'right', padding: '0.25rem 0.5rem' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {perPlan.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '0.5rem', opacity: 0.7 }}>
                    No charges to attribute.
                  </td>
                </tr>
              ) : (
                perPlan.map((row) => (
                  <tr key={`${row.planId}::${row.token}`}>
                    <td style={{ padding: '0.25rem 0.5rem' }}>
                      {row.planId === NO_PLAN_KEY ? (
                        <em>{NO_PLAN_LABEL}</em>
                      ) : (
                        row.planName
                      )}
                    </td>
                    <td style={{ padding: '0.25rem 0.5rem' }}>{row.token}</td>
                    <td style={{ padding: '0.25rem 0.5rem', textAlign: 'right' }}>
                      {row.count}
                    </td>
                    <td style={{ padding: '0.25rem 0.5rem', textAlign: 'right' }}>
                      {formatAmount(row.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ padding: '0.25rem 0.5rem', textAlign: 'right' }}>
                  <strong>Total</strong>
                </td>
                <td style={{ padding: '0.25rem 0.5rem', textAlign: 'right' }}>
                  <strong>{formatAmount(grandTotal)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', opacity: 0.7 }}>
            Charges for subscriptions without a plan are listed under “{NO_PLAN_LABEL}”.
          </p>
        </div>
      </div>
    </div>
  );
}