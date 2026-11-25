// Issues #204, #207, #205, #206 - Final React Features

import { useState, useEffect, useRef } from 'react';

// ============================================================================
// Issue #204: DeactivatePlanButton with plan name aria-label
// ============================================================================

interface DeactivatePlanButtonProps {
  planName: string;
  onDeactivate: () => void;
  disabled?: boolean;
}

export const DeactivatePlanButton: React.FC<DeactivatePlanButtonProps> = ({
  planName,
  onDeactivate,
  disabled = false,
}) => {
  return (
    <button
      onClick={onDeactivate}
      disabled={disabled}
      aria-label={`Deactivate plan ${planName}`}
      className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
    >
      Deactivate
    </button>
  );
};

// ============================================================================
// Issue #207: WalletProvider re-check on focus
// ============================================================================

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [freighterInstalled, setFreighterInstalled] = useState(false);
  const lastCheckRef = useRef<number>(0);

  // FIX: Re-check Freighter on focus (throttled)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();

        // Throttle: at most once per 5 seconds
        if (now - lastCheckRef.current > 5000) {
          lastCheckRef.current = now;
          checkFreighterInstalled();
        }
      }
    };

    const checkFreighterInstalled = async () => {
      try {
        const installed = !!(window as any).freighter;
        setFreighterInstalled(installed);
      } catch {
        setFreighterInstalled(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  return (
    <WalletContext.Provider value={{ freighterInstalled }}>
      {children}
    </WalletContext.Provider>
  );
};

// ============================================================================
// Issue #205: normalizeTo30Days tooltip on PlanCard
// ============================================================================

import { normalizeTo30Days } from '@/lib/format';

interface PlanCardProps {
  plan: Plan;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan }) => {
  const normalized = normalizeTo30Days(plan.amount, plan.interval);
  const isNonStandardInterval = plan.interval !== 518400;  // Not standard 30-day interval

  return (
    <div className="p-4 border rounded">
      <h3 className="font-semibold">{plan.name}</h3>

      <div className="mt-2 group relative">
        <span className="cursor-help border-b border-dotted">
          {plan.amount} TOKEN / {plan.interval} ledgers
        </span>

        {/* FIX: Show tooltip only when interval differs */}
        {isNonStandardInterval && (
          <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 p-2 bg-gray-800 text-white text-sm rounded whitespace-nowrap z-10">
            ≈ {normalized} TOKEN / 30 days
          </div>
        )}
      </div>

      <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
    </div>
  );
};

interface Plan {
  name: string;
  amount: number;
  interval: number;
  description: string;
}

// ============================================================================
// Issue #206: Plan creation form warns on short interval
// ============================================================================

const MIN_INTERVAL_LEDGERS = 720;  // One hour

interface CreatePlanFormProps {
  onSubmit: (planData: any) => void;
}

export const CreatePlanForm: React.FC<CreatePlanFormProps> = ({ onSubmit }) => {
  const [interval, setInterval] = useState('');
  const [showWarning, setShowWarning] = useState(false);

  const handleIntervalChange = (value: string) => {
    setInterval(value);

    // FIX: Warn on very short intervals
    try {
      const intervalValue = parseInt(value, 10);
      if (intervalValue > 0 && intervalValue < MIN_INTERVAL_LEDGERS) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    } catch {
      setShowWarning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // FIX: Non-blocking - allow submission even with warning
    onSubmit({ interval });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded">
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2">Interval (ledgers)</label>
        <input
          type="number"
          value={interval}
          onChange={(e) => handleIntervalChange(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="e.g., 518400 for ~30 days"
        />

        {/* FIX: Show non-blocking warning */}
        {showWarning && (
          <div className="mt-2 p-2 bg-orange-100 border border-orange-300 rounded text-orange-800 text-sm">
            ⚠️ Very short intervals may cause high transaction fees
          </div>
        )}
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Create Plan
      </button>
    </form>
  );
};
