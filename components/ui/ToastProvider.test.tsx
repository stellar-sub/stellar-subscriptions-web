import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastProvider';

function Trigger({ messages }: { messages: string[] }) {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        messages.forEach((message) => toast(message));
      }}
    >
      trigger
    </button>
  );
}

describe('ToastProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('deduplicates identical messages shown within 2 seconds', () => {
    render(
      <ToastProvider>
        <Trigger messages={['same error', 'same error']} />
      </ToastProvider>,
    );

    act(() => {
      screen.getByText('trigger').click();
    });

    expect(screen.getAllByText('same error')).toHaveLength(1);
  });

  it('shows the same message again after 2 seconds have passed', () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <Trigger messages={['same error']} />
      </ToastProvider>,
    );

    act(() => {
      screen.getByText('trigger').click();
    });

    expect(screen.getAllByText('same error')).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(2001);
    });

    act(() => {
      screen.getByText('trigger').click();
    });

    expect(screen.getAllByText('same error')).toHaveLength(2);
  });

  it('renders two different messages', () => {
    render(
      <ToastProvider>
        <Trigger messages={['first error', 'second error']} />
      </ToastProvider>,
    );

    act(() => {
      screen.getByText('trigger').click();
    });

    expect(screen.getAllByText('first error')).toHaveLength(1);
    expect(screen.getAllByText('second error')).toHaveLength(1);
  });
});