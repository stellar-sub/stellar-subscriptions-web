import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { SubscriptionCard } from './SubscriptionCard';
import type { Subscription } from '@/lib/types';

const baseSubscription: Subscription = {
  id: 'sub_123',
  planId: 'plan_basic',
  planName: 'Basic',
  status: 'active',
  amount: 1000,
  currency: 'usd',
  interval: 'month',
  currentPeriodEnd: '2024-12-31T00:00:00.000Z',
};

describe('SubscriptionCard', () => {
  it('renders the subscription details', () => {
    const { getByText } = render(<SubscriptionCard subscription={baseSubscription} />);

    expect(getByText('Basic')).toBeInTheDocument();
    expect(getByText('active')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SubscriptionCard subscription={baseSubscription} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
