'use client';

import { useEffect, useState } from 'react';

interface TxProgressProps {
  /** 0–100. When omitted, renders an indeterminate progress bar. */
  value?: number;
  label?: string;
}

/**
 * Progress bar for on-chain transactions.
 *
 * Respects `prefers-reduced-motion`: when the user asks for less motion the
 * indeterminate bar is rendered as a static, fully-visible track instead of
 * an animated sweep, and the determinate bar transitions are disabled. The
 * label and percentage always convey the state, so no essential information
 * depends on motion.
 */
export function TxProgress({ value, label }: TxProgressProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  const isIndeterminate = value === undefined;
  const clamped = isIndeterminate ? 0 : Math.min(100, Math.max(0, value));

  return (
    <div
      className="w-full"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isIndeterminate ? undefined : clamped}
      aria-label={label ?? 'Transaction progress'}
    >
      {label ? (
        <div className="mb-1 flex items-center justify-between text-sm text-gray-600">
          <span>{label}</span>
          {!isIndeterminate ? <span>{clamped}%</span> : null}
        </div>
      ) : null}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        {isIndeterminate ? (
          reducedMotion ? (
            <div className="h-full w-full rounded-full bg-blue-500" />
          ) : (
            <div className="h-full w-1/3 animate-[tx-progress_1.2s_ease-in-out_infinite] rounded-full bg-blue-500" />
          )
        ) : (
          <div
            className={`h-full rounded-full bg-blue-500${reducedMotion ? '' : ' transition-[width] duration-300'}`}
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>
    </div>
  );
}
