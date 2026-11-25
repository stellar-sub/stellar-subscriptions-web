import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlanDetailPage, { generateMetadata } from './page';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

const mockPlan = {
  id: 'plan-123',
  name: 'Pro Subscription',
  amount: '10',
  token: 'USDC',
  interval: 'monthly',
  description: 'A great plan',
};

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch as unknown as typeof fetch;
});

describe('PlanDetailPage', () => {
  it('renders the plan name', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlan,
    });

    const ui = await PlanDetailPage({ params: { id: 'plan-123' } });
    render(ui);

    expect(screen.getByText('Pro Subscription')).toBeInTheDocument();
  });
});

describe('generateMetadata', () => {
  it('returns metadata whose title and description contain the plan name', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPlan,
    });

    const metadata = await generateMetadata({ params: { id: 'plan-123' } });

    expect(metadata.title).toContain('Pro Subscription');
    expect(metadata.description).toContain('Pro Subscription');
    expect(metadata.description).toContain('10');
    expect(metadata.description).toContain('USDC');
    expect(metadata.description).toContain('monthly');
    expect(metadata.openGraph?.image).toBeDefined();
  });
});