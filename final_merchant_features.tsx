// Issues #196, #198, #197, #199 - Final Merchant Features

import { useState } from 'react';

// ============================================================================
// Issue #196: RevenueChart zero-state
// ============================================================================

interface RevenueChartProps {
  events: ChargeEvent[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ events }) => {
  // FIX: Check if events exist before rendering chart
  if (events.length === 0) {
    return (
      <EmptyState
        title="No charges yet"
        description="Once you charge subscriptions, revenue data will appear here"
      />
    );
  }

  return (
    <BarChart data={events}>
      {/* Chart content */}
    </BarChart>
  );
};

interface ChargeEvent {
  date: string;
  amount: number;
  token: string;
}

interface EmptyStateProps {
  title: string;
  description?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description }) => (
  <div className="text-center py-12 text-gray-500">
    <p className="text-lg font-semibold">{title}</p>
    {description && <p className="text-sm">{description}</p>}
  </div>
);

const BarChart: React.FC<{ data: ChargeEvent[]; children: React.ReactNode }> = ({ children }) => (
  <div>{children}</div>
);

// ============================================================================
// Issue #198: Deactivated label in table
// ============================================================================

interface Plan {
  id: number;
  name: string;
  active: boolean;
  status: string;
}

interface MerchantPlansTableProps {
  plans: Plan[];
}

export const MerchantPlansTable: React.FC<MerchantPlansTableProps> = ({ plans }) => {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="px-4 py-2 text-left">Plan Name</th>
          <th className="px-4 py-2 text-left">Status</th>
        </tr>
      </thead>
      <tbody>
        {plans.map(plan => (
          // FIX: Dim inactive plan rows
          <tr
            key={plan.id}
            className={`border-b hover:bg-gray-50 ${!plan.active ? 'opacity-50' : ''}`}
          >
            <td className="px-4 py-2">{plan.name}</td>
            <td className="px-4 py-2">
              {/* FIX: Show Active/Inactive badge */}
              <span className={`px-2 py-1 rounded text-xs ${
                plan.active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {plan.active ? 'Active' : 'Inactive'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ============================================================================
// Issue #197: Total revenue summary row
// ============================================================================

interface RevenueSummaryProps {
  events: ChargeEvent[];
}

export const RevenueSummary: React.FC<RevenueSummaryProps> = ({ events }) => {
  // FIX: Sum amounts per token
  const totals = new Map<string, number>();

  events.forEach(event => {
    const current = totals.get(event.token) || 0;
    totals.set(event.token, current + event.amount);
  });

  return (
    <div className="mt-6 p-4 bg-gray-50 rounded">
      <h3 className="font-semibold mb-3">Total charged</h3>
      <div className="space-y-2">
        {Array.from(totals.entries()).map(([token, total]) => (
          <div key={token} className="flex justify-between text-sm">
            <span>{token}</span>
            <span className="font-mono">{formatToken(total, token)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function formatToken(amount: number, token: string): string {
  return `${amount.toFixed(2)} ${token}`;
}

// ============================================================================
// Issue #199: DeactivatePlanButton with subscriber warning
// ============================================================================

interface DeactivatePlanButtonProps {
  planId: number;
  planName: string;
  subscriberCount: number;
  onDeactivate: () => void;
}

export const DeactivatePlanButton: React.FC<DeactivatePlanButtonProps> = ({
  planId,
  planName,
  subscriberCount,
  onDeactivate,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  if (showConfirm) {
    return (
      <div className="p-4 bg-orange-50 border border-orange-200 rounded">
        <p className="font-semibold mb-2">Deactivate {planName}?</p>

        {/* FIX: Show subscriber count warning */}
        {subscriberCount > 0 && (
          <p className="text-sm text-orange-800 mb-3">
            {subscriberCount} subscriber{subscriberCount !== 1 ? 's are' : ' is'} still active on this plan.
            New subscribers won't be able to sign up.
          </p>
        )}

        <p className="text-sm text-gray-600 mb-4">This cannot be undone.</p>

        <div className="flex gap-2">
          <button
            onClick={onDeactivate}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Deactivate
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
    >
      Deactivate
    </button>
  );
};
