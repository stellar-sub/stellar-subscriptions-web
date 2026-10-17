'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ChargeButton from './ChargeButton';

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'exhausted';

export interface SubscriberSubscription {
  id: string;
  subscriber: string;
  amount: number;
  nextChargeLedger: number;
  status: SubscriptionStatus;
  planId?: string | number | null;
  planName?: string | null;
}

interface SubscriberTableProps {
  subscriptions: SubscriberSubscription[];
  onReload?: () => void;
}

type StatusFilter = 'all' | SubscriptionStatus;
type SortKey = 'subscriber' | 'amount' | 'nextChargeLedger' | 'status' | 'plan';
type SortDirection = 'asc' | 'desc';

interface SortState {
  key: SortKey;
  direction: SortDirection;
}

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'exhausted', label: 'Exhausted' },
];

const SORT_KEYS: SortKey[] = ['subscriber', 'amount', 'nextChargeLedger', 'status', 'plan'];

function isStatusFilter(value: string | null): value is StatusFilter {
  return value !== null && STATUS_FILTERS.some((f) => f.value === value);
}

function isSortKey(value: string | null): value is SortKey {
  return value !== null && (SORT_KEYS as string[]).includes(value);
}

function isSortDirection(value: string | null): value is SortDirection {
  return value === 'asc' || value === 'desc';
}

function planLabel(sub: SubscriberSubscription): string {
  if (sub.planName) return sub.planName;
  if (sub.planId !== undefined && sub.planId !== null && sub.planId !== '') {
    return `Plan #${sub.planId}`;
  }
  return 'No plan';
}

function planKey(sub: SubscriberSubscription): string {
  if (sub.planId !== undefined && sub.planId !== null && sub.planId !== '') {
    return String(sub.planId);
  }
  return '__none__';
}

function statusText(sub: SubscriberSubscription): string {
  switch (sub.status) {
    case 'active':
      return `Active — not due until ledger ${sub.nextChargeLedger}`;
    case 'paused':
      return 'Paused — no charges will be made';
    case 'cancelled':
      return 'Cancelled — no further charges';
    case 'exhausted':
      return 'Cap reached — no further charges allowed';
    default:
      return '';
  }
}

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function SubscriberTable({ subscriptions, onReload }: SubscriberTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sort, setSort] = useState<SortState>({ key: 'subscriber', direction: 'asc' });
  const [initialized, setInitialized] = useState(false);

  // Initialize state from the URL on mount.
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    const urlPlan = searchParams.get('plan');
    const urlSortKey = searchParams.get('sort');
    const urlSortDir = searchParams.get('dir');

    if (isStatusFilter(urlStatus)) {
      setStatusFilter(urlStatus);
    }
    if (urlPlan !== null && urlPlan !== '') {
      setPlanFilter(urlPlan);
    }
    if (isSortKey(urlSortKey)) {
      setSort({
        key: urlSortKey,
        direction: isSortDirection(urlSortDir) ? urlSortDir : 'asc',
      });
    }
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist filter and sort selections in the URL.
  useEffect(() => {
    if (!initialized) return;

    const params = new URLSearchParams(Array.from(searchParams.entries()));

    if (statusFilter === 'all') {
      params.delete('status');
    } else {
      params.set('status', statusFilter);
    }

    if (planFilter === 'all') {
      params.delete('plan');
    } else {
      params.set('plan', planFilter);
    }

    if (sort.key === 'subscriber' && sort.direction === 'asc') {
      params.delete('sort');
      params.delete('dir');
    } else {
      params.set('sort', sort.key);
      params.set('dir', sort.direction);
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `?${nextQuery}` : '?', { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, planFilter, sort, initialized]);

  const planOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const sub of subscriptions) {
      const key = planKey(sub);
      if (!seen.has(key)) {
        seen.set(key, planLabel(sub));
      }
    }
    return Array.from(seen.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [subscriptions]);

  const visibleRows = useMemo(() => {
    const filtered = subscriptions.filter((sub) => {
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
      if (planFilter !== 'all' && planKey(sub) !== planFilter) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sort.key) {
        case 'subscriber':
          cmp = a.subscriber.localeCompare(b.subscriber);
          break;
        case 'amount':
          cmp = a.amount - b.amount;
          break;
        case 'nextChargeLedger':
          cmp = a.nextChargeLedger - b.nextChargeLedger;
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'plan':
          cmp = planLabel(a).localeCompare(planLabel(b));
          break;
        default:
          cmp = 0;
      }
      return sort.direction === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [subscriptions, statusFilter, planFilter, sort]);

  const toggleSort = useCallback((key: SortKey) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const sortIndicator = (key: SortKey) => {
    if (sort.key !== key) return '';
    return sort.direction === 'asc' ? ' ▲' : ' ▼';
  };

  const handleReload = useCallback(() => {
    if (onReload) onReload();
  }, [onReload]);

  const filtersActive = statusFilter !== 'all' || planFilter !== 'all';

  return (
    <div className="subscriber-table">
      <div className="subscriber-table__filters">
        <label className="subscriber-table__filter">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label className="subscriber-table__filter">
          <span>Plan</span>
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
            <option value="all">All</option>
            {planOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        {onReload ? (
          <button type="button" className="subscriber-table__reload" onClick={handleReload}>
            Reload
          </button>
        ) : null}
      </div>

      {visibleRows.length === 0 ? (
        <p className="subscriber-table__empty">
          {filtersActive
            ? 'No subscribers match the selected filters.'
            : 'No subscribers yet.'}
        </p>
      ) : (
        <table className="subscriber-table__table">
          <thead>
            <tr>
              <th>
                <button type="button" onClick={() => toggleSort('subscriber')}>
                  Subscriber{sortIndicator('subscriber')}
                </button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort('amount')}>
                  Amount{sortIndicator('amount')}
                </button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort('nextChargeLedger')}>
                  Next charge ledger{sortIndicator('nextChargeLedger')}
                </button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort('status')}>
                  Status{sortIndicator('status')}
                </button>
              </th>
              <th>
                <button type="button" onClick={() => toggleSort('plan')}>
                  Plan{sortIndicator('plan')}
                </button>
              </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((sub) => (
              <tr key={sub.id}>
                <td>{sub.subscriber}</td>
                <td>{formatAmount(sub.amount)}</td>
                <td>{sub.nextChargeLedger}</td>
                <td>
                  <span className={`subscriber-table__status subscriber-table__status--${sub.status}`}>
                    {sub.status}
                  </span>
                  <span className="subscriber-table__status-detail">{statusText(sub)}</span>
                </td>
                <td>{planLabel(sub)}</td>
                <td>
                  <ChargeButton subscriptionId={sub.id} disabled={sub.status !== 'active'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}