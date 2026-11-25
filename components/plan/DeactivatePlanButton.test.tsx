import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DeactivatePlanButton from './DeactivatePlanButton';
import * as usePlans from '@/hooks/usePlans';

vi.mock('@/lib/useTx', () => ({
  useTx: vi.fn(),
}));

vi.mock('@/lib/contracts', () => ({
  deactivatePlan: vi.fn(),
}));

vi.mock('@/hooks/usePlans', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/usePlans')>(
    '@/hooks/usePlans'
  );
  return {
    ...actual,
    invalidatePlans: vi.fn(),
  };
});

import { useTx } from '@/lib/useTx';
import { deactivatePlan } from '@/lib/contracts';

const mockedUseTx = vi.mocked(useTx);
const mockedDeactivatePlan = vi.mocked(deactivatePlan);
const mockedInvalidatePlans = vi.mocked(usePlans.invalidatePlans);

describe('DeactivatePlanButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls invalidatePlans after a successful deactivation', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    mockedUseTx.mockReturnValue({
      execute,
      status: 'idle',
      error: null,
    } as unknown as ReturnType<typeof useTx>);
    mockedDeactivatePlan.mockResolvedValue(undefined as never);

    render(<DeactivatePlanButton planId="plan-1" />);

    fireEvent.click(screen.getByRole('button', { name: /deactivate/i }));

    const confirmButton = await screen.findByRole('button', {
      name: /confirm/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(execute).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockedInvalidatePlans).toHaveBeenCalled();
    });
  });

  it('does not call invalidatePlans when deactivation rejects', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('tx failed'));
    mockedUseTx.mockReturnValue({
      execute,
      status: 'idle',
      error: null,
    } as unknown as ReturnType<typeof useTx>);
    mockedDeactivatePlan.mockRejectedValue(new Error('tx failed'));

    render(<DeactivatePlanButton planId="plan-1" />);

    fireEvent.click(screen.getByRole('button', { name: /deactivate/i }));

    const confirmButton = await screen.findByRole('button', {
      name: /confirm/i,
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(execute).toHaveBeenCalled();
    });

    expect(mockedInvalidatePlans).not.toHaveBeenCalled();
  });
});