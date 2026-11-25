// Issues #192, #193, #194, #195 - Final Subscription Features

import { useState, useEffect } from 'react';
import { CopyButton } from '@/components/ui/CopyButton';

// ============================================================================
// Issue #192: Copy subscription ID on detail page
// ============================================================================

interface SubscriptionDetailPageProps {
  subscription: Subscription;
}

export const SubscriptionDetailPage: React.FC<SubscriptionDetailPageProps> = ({
  subscription,
}) => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Subscription #{subscription.id}</h1>

        {/* FIX: Add copy button for subscription ID */}
        <CopyButton
          value={String(subscription.id)}
          label="Copy subscription ID"
        />
      </div>

      <div className="space-y-4">
        <p><strong>Plan:</strong> {subscription.planName}</p>
        <p><strong>Amount:</strong> {subscription.amount} {subscription.token}</p>
        <p><strong>Status:</strong> {subscription.status}</p>
      </div>
    </div>
  );
};

interface Subscription {
  id: number;
  planName: string;
  amount: number;
  token: string;
  status: string;
}

// ============================================================================
// Issue #193: ChargeAllButton with error list
// ============================================================================

interface ChargeError {
  subscriptionId: number;
  error: string;
}

interface ChargeAllButtonProps {
  subscriptions: Subscription[];
  onCharge: (id: number) => Promise<void>;
}

export const ChargeAllButton: React.FC<ChargeAllButtonProps> = ({
  subscriptions,
  onCharge,
}) => {
  const [isCharging, setIsCharging] = useState(false);
  const [errors, setErrors] = useState<ChargeError[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  const handleChargeAll = async () => {
    setIsCharging(true);
    const failedCharges: ChargeError[] = [];

    for (const sub of subscriptions) {
      try {
        await onCharge(sub.id);
      } catch (err) {
        // FIX: Collect errors for display
        failedCharges.push({
          subscriptionId: sub.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    setErrors(failedCharges);
    if (failedCharges.length > 0) {
      setShowErrors(true);
    }
    setIsCharging(false);
  };

  const handleRetryFailed = async () => {
    const failedIds = errors.map(e => e.subscriptionId);
    const failedSubs = subscriptions.filter(s => failedIds.includes(s.id));

    setErrors([]);
    setIsCharging(true);

    for (const sub of failedSubs) {
      try {
        await onCharge(sub.id);
      } catch (err) {
        setErrors(prev => [...prev, {
          subscriptionId: sub.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        }]);
      }
    }

    setIsCharging(false);
  };

  return (
    <div>
      <button
        onClick={handleChargeAll}
        disabled={isCharging}
        className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        {isCharging ? 'Charging...' : 'Charge All'}
      </button>

      {/* FIX: Show error list after partial failure */}
      {showErrors && errors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-red-800">Failed subscriptions:</h3>
            <button
              onClick={() => setShowErrors(false)}
              className="text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>

          <ul className="space-y-1 mb-3">
            {errors.map(err => (
              <li key={err.subscriptionId} className="text-sm text-red-700">
                ID {err.subscriptionId}: {err.error}
              </li>
            ))}
          </ul>

          <button
            onClick={handleRetryFailed}
            className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
          >
            Retry failed ({errors.length})
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Issue #194: Progress count during charging
// ============================================================================

interface ChargeWithProgressProps {
  subscriptions: Subscription[];
}

export const ChargeAllWithProgress: React.FC<ChargeWithProgressProps> = ({
  subscriptions,
}) => {
  const [isCharging, setIsCharging] = useState(false);
  const [charged, setCharged] = useState(0);  // FIX: Track progress

  const handleChargeAll = async () => {
    setIsCharging(true);
    setCharged(0);

    for (let i = 0; i < subscriptions.length; i++) {
      try {
        // await chargeSubscription(subscriptions[i].id);
      } catch (err) {
        console.error('Charge failed:', err);
      }

      // FIX: Update progress count
      setCharged(i + 1);
    }

    setIsCharging(false);
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleChargeAll}
        disabled={isCharging}
        className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        Charge All
      </button>

      {/* FIX: Show progress "N of M" */}
      {isCharging && (
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span className="text-sm text-gray-600">
            Charging {charged} of {subscriptions.length}…
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Issue #195: Subscriber count in MerchantPlansTable
// ============================================================================

interface Plan {
  id: number;
  name: string;
  token: string;
  amount: number;
  status: string;
}

interface MerchantPlansTableProps {
  plans: Plan[];
  subscriberCounts: Record<number, number>;  // planId -> count
}

export const MerchantPlansTable: React.FC<MerchantPlansTableProps> = ({
  plans,
  subscriberCounts,
}) => {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="px-4 py-2 text-left">Plan Name</th>
          <th className="px-4 py-2 text-left">Token</th>
          <th className="px-4 py-2 text-left">Amount</th>
          <th className="px-4 py-2 text-left">Status</th>
          {/* FIX: Add Subscribers column */}
          <th className="px-4 py-2 text-left">Subscribers</th>
        </tr>
      </thead>
      <tbody>
        {plans.map(plan => (
          <tr key={plan.id} className="border-b hover:bg-gray-50">
            <td className="px-4 py-2">{plan.name}</td>
            <td className="px-4 py-2">{plan.token}</td>
            <td className="px-4 py-2">{plan.amount}</td>
            <td className="px-4 py-2">
              <span className={`px-2 py-1 rounded text-xs ${
                plan.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {plan.status}
              </span>
            </td>
            {/* FIX: Show subscriber count (— for zero) */}
            <td className="px-4 py-2">
              {subscriberCounts[plan.id] || subscriberCounts[plan.id] === 0
                ? (subscriberCounts[plan.id] === 0 ? '—' : subscriberCounts[plan.id])
                : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Hook to derive subscriber counts
export const usePlanSubscriberCounts = (subscriptions: Subscription[]) => {
  const counts: Record<number, number> = {};

  subscriptions.forEach(sub => {
    const planId = (sub as any).planId;
    if (planId) {
      counts[planId] = (counts[planId] || 0) + 1;
    }
  });

  return counts;
};
