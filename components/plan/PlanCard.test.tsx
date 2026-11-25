import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('renders a copy link button with the plan URL', () => {
    render(<PlanCard plan={samplePlan} />);

    const copyButton = screen.getByRole('button', { name: /copy link/i });
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toHaveAttribute(
      'data-value',
      `${window.location.origin}/plans/${samplePlan.id}`,
    );
  });

  it('copies the plan URL to the clipboard without navigating', async () => {
    render(<PlanCard plan={samplePlan} />);

    const copyButton = screen.getByRole('button', { name: /copy link/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/plans/${samplePlan.id}`,
      );
    });
  });
});