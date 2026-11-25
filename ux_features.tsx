// Issues #202, #203, #200, #201 - UX Features

// ============================================================================
// Issue #202: Share Plan Button on Plan Detail Page
// ============================================================================

// pages/plans/[id].tsx
import { PlanShare } from '@/components/merchant/PlanShare';

export default function PlanDetailPage({ plan }: { plan: Plan }) {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{plan.name}</h1>
        <PlanShare planId={plan.id} />
      </div>
      {/* Plan details... */}
    </div>
  );
}

// components/merchant/PlanShare.tsx
import { CopyButton } from '@/components/ui/CopyButton';
import { useState } from 'react';

interface PlanShareProps {
  planId: string;
}

export const PlanShare: React.FC<PlanShareProps> = ({ planId }) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/plans/${planId}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this Stellar subscription plan',
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      {copied ? '✓ Copied' : 'Share Plan'}
    </button>
  );
};

// ============================================================================
// Issue #203: Accessibility - Empty Filter Announcement
// ============================================================================

// components/PlanGrid.tsx
import { useEffect, useRef, useState } from 'react';

interface PlanGridProps {
  plans: Plan[];
  filterToken?: string;
}

export const PlanGrid: React.FC<PlanGridProps> = ({ plans, filterToken }) => {
  const statusRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (filterToken && plans.length === 0) {
      setAnnouncement(`No plans match the current filter for ${filterToken}`);
    } else if (!filterToken && plans.length === 0) {
      setAnnouncement('No plans available');
    } else {
      setAnnouncement(`Showing ${plans.length} plans`);
    }
  }, [plans, filterToken]);

  if (plans.length === 0) {
    return (
      <div>
        <div
          ref={statusRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>{announcement}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        ref={statusRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map(plan => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Issue #200: Keyboard Shortcut for ChargeAllButton
// ============================================================================

// components/ChargeAllButton.tsx
import { useEffect, useRef } from 'react';

interface ChargeAllButtonProps {
  disabled?: boolean;
  isPending?: boolean;
  onCharge: () => Promise<void>;
}

export const ChargeAllButton: React.FC<ChargeAllButtonProps> = ({
  disabled = false,
  isPending = false,
  onCharge,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.code === 'KeyC') {
        e.preventDefault();

        if (!disabled && !isPending && buttonRef.current) {
          onCharge();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, isPending, onCharge]);

  return (
    <button
      ref={buttonRef}
      onClick={onCharge}
      disabled={disabled || isPending}
      title="Charge all subscriptions (Shift+C)"
      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
    >
      {isPending ? 'Charging...' : 'Charge All'}
      <span className="text-xs ml-2 opacity-75">(Shift+C)</span>
    </button>
  );
};

// ============================================================================
// Issue #201: SubscriberTable with AddressLink & CopyButton
// ============================================================================

// components/SubscriberTable.tsx
import { AddressLink } from '@/components/ui/AddressLink';
import { CopyButton } from '@/components/ui/CopyButton';

interface Subscriber {
  id: string;
  subscriber: string;
  email: string;
  status: string;
}

interface SubscriberTableProps {
  subscribers: Subscriber[];
}

export const SubscriberTable: React.FC<SubscriberTableProps> = ({
  subscribers,
}) => {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="px-4 py-2 text-left">Address</th>
          <th className="px-4 py-2 text-left">Email</th>
          <th className="px-4 py-2 text-left">Status</th>
        </tr>
      </thead>
      <tbody>
        {subscribers.map(sub => (
          <tr key={sub.id} className="border-b hover:bg-gray-50">
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <AddressLink address={sub.subscriber} />
                <CopyButton value={sub.subscriber} size="sm" />
              </div>
            </td>
            <td className="px-4 py-2">{sub.email}</td>
            <td className="px-4 py-2">
              <span className={`px-2 py-1 rounded text-xs ${
                sub.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {sub.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
