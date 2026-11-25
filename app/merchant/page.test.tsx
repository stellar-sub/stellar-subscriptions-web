import React from 'react';
import { render, screen } from '@testing-library/react';
import MerchantPage from './page';

jest.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    address: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV',
    isConnected: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
}));

jest.mock('@/hooks/useMerchantPlans', () => ({
  useMerchantPlans: () => ({
    plans: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/hooks/useToken', () => ({
  useToken: () => ({
    token: null,
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/hooks/useTokenBalance', () => ({
  useTokenBalance: () => ({
    balance: '0',
    isLoading: false,
    error: null,
  }),
}));

const mockChargeEvents: Array<{ amount: string; createdAt: string }> = [];

jest.mock('@/hooks/useMerchantStats', () => ({
  useMerchantStats: () => ({
    totalCharged: '0',
    chargeEvents: mockChargeEvents,
    isLoading: false,
    error: null,
  }),
}));

const ADDRESS = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

describe('MerchantPage', () => {
  beforeEach(() => {
    mockChargeEvents.length = 0;
  });

  it('matches snapshot', () => {
    const { asFragment } = render(<MerchantPage />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders a copyable AddressLink for the connected address', () => {
    render(<MerchantPage />);

    const link = screen.getByRole('link', { name: ADDRESS });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      'href',
      `https://stellar.expert/explorer/public/account/${ADDRESS}`,
    );

    expect(
      screen.getByRole('button', { name: /copy/i }),
    ).toBeInTheDocument();
  });

  describe('revenue trend indicator', () => {
    it('renders a green up indicator with the percentage for a positive change', () => {
      mockChargeEvents.push(
        { amount: '120', createdAt: daysAgo(1) },
        { amount: '100', createdAt: daysAgo(8) },
      );

      render(<MerchantPage />);

      const trend = screen.getByTestId('revenue-trend');
      expect(trend).toHaveTextContent('▲');
      expect(trend).toHaveTextContent('20%');
      expect(trend).toHaveTextContent(/vs last week/i);
      expect(trend).toHaveClass('text-green-600');
    });

    it('renders a red down indicator for a negative change', () => {
      mockChargeEvents.push(
        { amount: '50', createdAt: daysAgo(1) },
        { amount: '100', createdAt: daysAgo(8) },
      );

      render(<MerchantPage />);

      const trend = screen.getByTestId('revenue-trend');
      expect(trend).toHaveTextContent('▼');
      expect(trend).toHaveTextContent('50%');
      expect(trend).toHaveClass('text-red-600');
    });

    it('renders a grey flat indicator when revenue is unchanged', () => {
      mockChargeEvents.push(
        { amount: '100', createdAt: daysAgo(1) },
        { amount: '100', createdAt: daysAgo(8) },
      );

      render(<MerchantPage />);

      const trend = screen.getByTestId('revenue-trend');
      expect(trend).toHaveTextContent('→');
      expect(trend).toHaveTextContent('0%');
      expect(trend).toHaveClass('text-gray-500');
    });

    it('renders "New" when last week had zero revenue', () => {
      mockChargeEvents.push({ amount: '100', createdAt: daysAgo(1) });

      render(<MerchantPage />);

      const trend = screen.getByTestId('revenue-trend');
      expect(trend).toHaveTextContent('New');
      expect(trend).toHaveClass('text-green-600');
    });
  });
});