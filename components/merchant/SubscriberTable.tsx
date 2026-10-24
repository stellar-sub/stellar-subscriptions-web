'use client';

import { useCallback, useMemo } from 'react';

export interface Subscriber {
  address: string;
  tokenSymbol: string;
  tokenAddress: string;
  /** Raw amount as a bigint (or its exact decimal string) — never a float. */
  rawAmount: bigint | string;
  /** Number of decimals for the token, used to format the display amount. */
  decimals: number;
  status: string;
}

interface SubscriberTableProps {
  subscribers: Subscriber[];
  /** Optional filename for the CSV download. */
  fileName?: string;
}

/**
 * Format a raw integer amount (bigint or decimal string) into a human-readable
 * decimal string using the token's decimals. Uses pure string manipulation so
 * there is no floating-point rounding.
 */
function formatAmount(rawAmount: bigint | string, decimals: number): string {
  const raw = typeof rawAmount === 'bigint' ? rawAmount.toString() : rawAmount.trim();

  // Handle optional sign.
  const negative = raw.startsWith('-');
  const digits = negative ? raw.slice(1) : raw;

  // Guard against non-numeric input.
  if (!/^\d+$/.test(digits)) {
    return raw;
  }

  if (decimals <= 0) {
    return `${negative ? '-' : ''}${digits}`;
  }

  const padded = digits.padStart(decimals + 1, '0');
  const integerPart = padded.slice(0, padded.length - decimals);
  const fractionalPart = padded.slice(padded.length - decimals).replace(/0+$/, '');

  const sign = negative ? '-' : '';
  return fractionalPart.length > 0
    ? `${sign}${integerPart}.${fractionalPart}`
    : `${sign}${integerPart}`;
}

/** Escape a single CSV field per RFC 4180. */
function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(subscribers: Subscriber[]): string {
  const header = [
    'Subscriber Address',
    'Token Symbol',
    'Token Address',
    'Raw Amount',
    'Formatted Amount',
    'Status',
  ];

  const rows = subscribers.map((subscriber) => {
    const raw =
      typeof subscriber.rawAmount === 'bigint'
        ? subscriber.rawAmount.toString()
        : subscriber.rawAmount.trim();
    const formatted = `${formatAmount(subscriber.rawAmount, subscriber.decimals)} ${subscriber.tokenSymbol}`;

    return [
      subscriber.address,
      subscriber.tokenSymbol,
      subscriber.tokenAddress,
      raw,
      formatted,
      subscriber.status,
    ];
  });

  return [header, ...rows]
    .map((row) => row.map((field) => escapeCsvField(String(field))).join(','))
    .join('\r\n');
}

export default function SubscriberTable({ subscribers, fileName = 'subscribers.csv' }: SubscriberTableProps) {
  const rows = useMemo(
    () =>
      subscribers.map((subscriber) => ({
        ...subscriber,
        rawDisplay:
          typeof subscriber.rawAmount === 'bigint'
            ? subscriber.rawAmount.toString()
            : subscriber.rawAmount,
        formattedDisplay: `${formatAmount(subscriber.rawAmount, subscriber.decimals)} ${subscriber.tokenSymbol}`,
      })),
    [subscribers],
  );

  const handleDownloadCsv = useCallback(() => {
    const csv = buildCsv(subscribers);
    // Prepend a BOM so spreadsheet apps detect UTF-8 correctly.
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }, [subscribers, fileName]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <button type="button" onClick={handleDownloadCsv} disabled={subscribers.length === 0}>
          Download CSV
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th scope="col">Subscriber</th>
            <th scope="col">Token</th>
            <th scope="col">Token Address</th>
            <th scope="col">Raw Amount</th>
            <th scope="col">Formatted Amount</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6}>No subscribers yet.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={`${row.address}-${row.tokenAddress}`}>
                <td>
                  <code>{row.address}</code>
                </td>
                <td>{row.tokenSymbol}</td>
                <td>
                  <code>{row.tokenAddress}</code>
                </td>
                <td>
                  <code>{row.rawDisplay}</code>
                </td>
                <td>{row.formattedDisplay}</td>
                <td>{row.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}