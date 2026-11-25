import { useMemo } from 'react';
import { useMerchantSubscriptions } from './useMerchantSubscriptions';
import { useChargeEvents } from './useChargeEvents';
import { SubStatus } from '../types/subscription';
import type { Subscription } from '../types/subscription';
import type { ChargeEvent } from '../types/charge';

export interface MerchantStats {
  dueCount: number;
  activeCount: number;
  revenueThisMonth: Record<string, bigint>;
  loading: boolean;
  error: Error | null;
}

function getLatestLedger(subscriptions: Subscription[]): number {
  let latest = 0;
  for (const sub of subscriptions) {
    if (typeof sub.lastChargeLedger === 'number' && sub.lastChargeLedger > latest) {
      latest = sub.lastChargeLedger;
    }
  }
  return latest;
}

function isInCurrentMonth(timestamp: number, now: Date): boolean {
  const date = new Date(timestamp);
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth()
  );
}

export function useMerchantStats(merchant: string | null): MerchantStats {
  const {
    subscriptions,
    loading: subscriptionsLoading,
    error: subscriptionsError,
  } = useMerchantSubscriptions(merchant);

  const {
    chargeEvents,
    loading: chargeEventsLoading,
    error: chargeEventsError,
  } = useChargeEvents(merchant);

  const { dueCount, activeCount, revenueThisMonth } = useMemo(() => {
    const subs: Subscription[] = subscriptions ?? [];
    const events: ChargeEvent[] = chargeEvents ?? [];

    const latestLedger = getLatestLedger(subs);

    let due = 0;
    let active = 0;
    const tokenBySubscription = new Map<string, string>();

    for (const sub of subs) {
      if (sub.status === SubStatus.Active) {
        active += 1;
        if (typeof sub.nextChargeLedger === 'number' && sub.nextChargeLedger <= latestLedger) {
          due += 1;
        }
      }
      if (sub.token) {
        tokenBySubscription.set(sub.id, sub.token);
      }
    }

    const now = new Date();
    const revenue: Record<string, bigint> = {};

    for (const event of events) {
      if (!isInCurrentMonth(event.timestamp, now)) {
        continue;
      }
      const token = event.token ?? tokenBySubscription.get(event.subscriptionId);
      if (!token) {
        continue;
      }
      const amount = BigInt(event.amount ?? 0);
      revenue[token] = (revenue[token] ?? 0n) + amount;
    }

    return { dueCount: due, activeCount: active, revenueThisMonth: revenue };
  }, [subscriptions, chargeEvents]);

  return {
    dueCount,
    activeCount,
    revenueThisMonth,
    loading: subscriptionsLoading || chargeEventsLoading,
    error: subscriptionsError ?? chargeEventsError ?? null,
  };
}