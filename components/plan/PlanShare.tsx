'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import CopyButton from '@/components/ui/CopyButton';

export interface PlanShareProps {
  /** The plan id used to build `/plans/{id}`. */
  planId: string;
  /** Optional plan name used for accessible labeling and the caption. */
  planName?: string;
  /** Called after the link is successfully copied. */
  onCopied?: () => void;
}

/**
 * Builds the absolute URL for a plan. Falls back to a relative path during SSR
 * (or when `window` is unavailable) so the component renders safely on the server.
 */
function buildPlanUrl(planId: string): string {
  const path = `/plans/${encodeURIComponent(planId)}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export default function PlanShare({ planId, planName, onCopied }: PlanShareProps) {
  const [planUrl, setPlanUrl] = useState<string>(() => buildPlanUrl(planId));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  // Resolve the absolute URL on the client after hydration.
  useEffect(() => {
    setPlanUrl(buildPlanUrl(planId));
  }, [planId]);

  // Render the QR code client-side onto a canvas. No external service is used,
  // so the QR code works fully offline.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    setQrError(null);

    QRCode.toCanvas(canvas, planUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 192,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    }).catch(() => {
      if (!cancelled) {
        setQrError('Unable to generate the QR code.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [planUrl]);

  const label = useMemo(() => {
    const name = planName?.trim();
    return name ? `Share link and QR code for ${name}` : 'Share link and QR code for this plan';
  }, [planName]);

  const qrAriaLabel = useMemo(() => {
    const name = planName?.trim();
    return name
      ? `QR code linking to the shareable plan page for ${name}`
      : 'QR code linking to the shareable plan page';
  }, [planName]);

  return (
    <section aria-label={label} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="plan-share-url" className="text-sm font-medium text-gray-700">
          Shareable plan link
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="plan-share-url"
            type="text"
            readOnly
            value={planUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <CopyButton value={planUrl} onCopied={onCopied} />
        </div>
      </div>

      <div className="flex flex-col items-start gap-2">
        <div
          role="img"
          aria-label={qrAriaLabel}
          className="rounded-md border border-gray-200 bg-white p-2"
        >
          <canvas ref={canvasRef} width={192} height={192} aria-hidden="true" />
        </div>
        {qrError ? (
          <p role="alert" className="text-sm text-red-600">
            {qrError}
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            Scan this QR code to open the plan. It works offline — no external service is used.
          </p>
        )}
      </div>
    </section>
  );
}