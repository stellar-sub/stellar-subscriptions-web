import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AllowanceBanner from './AllowanceBanner';

// Mock wallet hook
vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    address: '0x1234567890abcdef1234567890abcdef12345678',
    network: 'testnet',
  }),
}));

// Mock async hook - controlled per test
const mockUseAsync = vi.fn();
vi.mock('@/hooks/useAsync', () => ({
  useAsync: (...args: unknown[]) => mockUseAsync(...args),
}));

// Mock contracts
const mockGetSubscriptionAllowance = vi.fn();
const mockRefreshAllowance = vi.fn();
vi.mock('@/lib/contracts', () => ({
  getSubscriptionAllowance: (...args: unknown[]) =>
    mockGetSubscriptionAllowance(...args),
  refreshAllowance: (...args: unknown[]) => mockRefreshAllowance(...args),
}));

// Mock tx hook
const mockRun = vi.fn();
vi.mock('@/hooks/useTx', () => ({
  useTx: () => ({
    run: mockRun,
    loading: false,
    error: null,
  }),
}));

const subscription = {
  id: 'sub-1',
  subscriber: '0x1234567890abcdef1234567890abcdef12345678',
  remainingCap: 100n,
  allowance: 100n,
} as any;

describe('AllowanceBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render the banner when allowance is greater than or equal to the remaining cap', () => {
    mockUseAsync.mockReturnValue({
      data: 100n,
      error: null,
      loading: false,
      reload: vi.fn(),
    });

    const { container } = render(
      <AllowanceBanner subscription={{ ...subscription, allowance: 100n }} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/refresh allowance/i)).not.toBeInTheDocument();
  });

  it('renders the banner with the correct message when allowance is below the remaining cap', () => {
    mockUseAsync.mockReturnValue({
      data: 10n,
      error: null,
      loading: false,
      reload: vi.fn(),
    });

    render(
      <AllowanceBanner subscription={{ ...subscription, allowance: 10n }} />,
    );

    expect(screen.getByText(/allowance/i)).toBeInTheDocument();
    expect(screen.getByText(/below/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /refresh allowance/i }),
    ).toBeInTheDocument();
  });

  it('triggers the refresh transaction when the refresh button is clicked', () => {
    mockUseAsync.mockReturnValue({
      data: 10n,
      error: null,
      loading: false,
      reload: vi.fn(),
    });

    render(
      <AllowanceBanner subscription={{ ...subscription, allowance: 10n }} />,
    );

    const button = screen.getByRole('button', { name: /refresh allowance/i });
    fireEvent.click(button);

    expect(mockRun).toHaveBeenCalledTimes(1);
  });
});