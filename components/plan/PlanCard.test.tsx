import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PlanCard from './PlanCard';
import type { Plan } from '@/types';

// Mock useLedger so PlanCard can render without a LedgerProvider.
vi.mock('@/hooks/useLedger', () => ({
  useLedger: () => ({
    latestLedger: undefined,
    latestClosedAt: undefined,
  }),
}));

const samplePlan: Plan = {
  id: '1',
  name: 'Sample Plan',
  description: 'A sample plan for testing',
  createdAt: 1000,
  owner: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUV',
  interval: 'monthly',
  amount: '10',
  asset: 'XLM',
  status: 'active',
} as unknown as Plan;

function formatExpectedDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

describe('PlanCard', () => {
  it('renders an estimated creation date when ledger props are provided', () => {
    const latestClosedAt = new Date('2024-01-15T12:00:00Z');
    const latestLedger = 2000;

    render(
      <PlanCard
        plan={samplePlan}
        latestLedger={latestLedger}
        latestClosedAt={latestClosedAt}
      />,
    );

    expect(screen.getByText(/Created ≈/)).toBeInTheDocument();

    const expectedDate = formatExpectedDate(latestClosedAt);
    expect(screen.getByText(new RegExp(expectedDate))).toBeInTheDocument();
  });

  it('does not render the created line when ledger props are omitted', () => {
    render(<PlanCard plan={samplePlan} />);

    expect(screen.queryByText(/Created ≈/)).not.toBeInTheDocument();
  });
});