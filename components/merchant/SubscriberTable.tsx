'use client';

import React from 'react';
import Link from 'next/link';
import { SubStatusBadge } from './SubStatusBadge';
import { AddressLink } from '@/components/common/AddressLink';
import { TokenAmount } from '@/components/common/TokenAmount';
import { shortAddress } from '@/lib/format';
import type { Subscription } from '@/lib/types';

interface SubscriberTableProps {
  subs: Subscription[];
  ledgerSequence: number;
  ledgerCloseTime?: number;
}

function capPercent(charged: bigint, cap: bigint): number {
  if (cap <= 0n) return 0;
  const pct = Number((charged * 10000n) / cap) / 100;
  return Math.max(0, Math.min(100, pct));
}

function formatEstimate(
  sub: Subscription,
  ledgerSequence: number,
  ledgerCloseTime?: number,
): string {
  if (sub.status === 'cancelled') {
    return 'No further charges — subscription cancelled';
  }
  if (sub.status === 'exhausted' || sub.totalCharged >= sub.totalCap) {
    return 'No further charges — cap reached';
  }

  const remaining = sub.nextChargeLedger - ledgerSequence;

  if (remaining <= 0) {
    return 'Eligible now — the contract allows at most one charge per interval';
  }

  if (ledgerCloseTime) {
    const seconds = remaining * ledgerCloseTime;
    if (seconds < 60) {
      return `in about ${Math.max(1, Math.round(seconds))}s (estimate)`;
    }
    if (seconds < 3600) {
      return `in about ${Math.round(seconds / 60)}m (estimate)`;
    }
    if (seconds < 86400) {
      return `in about ${Math.round(seconds / 3600)}h (estimate)`;
    }
    return `in about ${Math.round(seconds / 86400)}d (estimate)`;
  }

  return `in about ${remaining} ledger${remaining === 1 ? '' : 's'} (estimate)`;
}

export function SubscriberTable({
  subs,
  ledgerSequence,
  ledgerCloseTime,
}: SubscriberTableProps) {
  if (!subs || subs.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
        No subscribers yet.
      </div>
    );
  }

  return (
    <>
      {/* Desktop / wide screens */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white md:block">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Subscription
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Subscriber
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Charged of cap
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">
                Next charge
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {subs.map((sub) => {
              const pct = capPercent(sub.totalCharged, sub.totalCap);
              return (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">
                    <Link
                      href={`/subscriptions/${sub.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      #{sub.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <AddressLink address={sub.subscriber}>
                      {shortAddress(sub.subscriber)}
                    </AddressLink>
                  </td>
                  <td className="px-4 py-3">
                    <SubStatusBadge status={sub.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-700">
                        <TokenAmount amount={sub.totalCharged} /> of{' '}
                        <TokenAmount amount={sub.totalCap} />
                      </span>
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
                        role="progressbar"
                        aria-valuenow={Math.round(pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatEstimate(sub, ledgerSequence, ledgerCloseTime)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Narrow screens: stacked cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {subs.map((sub) => {
          const pct = capPercent(sub.totalCharged, sub.totalCap);
          return (
            <div
              key={sub.id}
              className="rounded-lg border border-gray-200 bg-white p-4 text-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <Link
                  href={`/subscriptions/${sub.id}`}
                  className="font-mono text-blue-600 hover:underline"
                >
                  #{sub.id}
                </Link>
                <SubStatusBadge status={sub.status} />
              </div>
              <dl className="grid grid-cols-1 gap-2">
                <div>
                  <dt className="text-xs text-gray-500">Subscriber</dt>
                  <dd>
                    <AddressLink address={sub.subscriber}>
                      {shortAddress(sub.subscriber)}
                    </AddressLink>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Charged of cap</dt>
                  <dd className="flex flex-col gap-1">
                    <span className="text-gray-700">
                      <TokenAmount amount={sub.totalCharged} /> of{' '}
                      <TokenAmount amount={sub.totalCap} />
                    </span>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
                      role="progressbar"
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Next charge</dt>
                  <dd className="text-gray-700">
                    {formatEstimate(sub, ledgerSequence, ledgerCloseTime)}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default SubscriberTable;