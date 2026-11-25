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

const ADDRESS = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUV';

describe('MerchantPage', () => {
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
});