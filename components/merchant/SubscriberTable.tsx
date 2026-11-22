'use client';

import { useCallback, useContext, useMemo } from 'react';
import { WalletContext } from '@/hooks/useWallet';
import { useSubscriptionNotes } from '@/hooks/useSubscriptionNotes';
import { useToken } from '@/hooks/useToken';
import type { Network } from '@/types';

export interface Subscriber {
  id?: number | string;
  address: string;
  tokenSymbol: string;
  tokenAddress: string;
  rawAmount: bigint | string;
  decimals: number;
  status: string;
}

interface SubscriberTableProps {
  subscribers: Subscriber[];
  fileName?: string;
  network?: Network;
}

function formatAmount(rawAmount: bigint | string, decimals: number): string {
  const raw = typeof rawAmount === 'bigint' ? rawAmount.toString() : rawAmount.trim();
  const negative = raw.startsWith('-');
  const digits = negative ? raw.slice(1) : raw;
  if (!/^\d+$/.test(digits)) return raw;
  if (decimals <= 0) return `${negative ? '-' : ''}${digits}`;
  const padded = digits.padStart(decimals + 1, '0');
  const intPart = padded.slice(0, padded.length - decimals);
  const fracPart = padded.slice(padded.length - decimals).replace(/0+$/, '');
  return fracPart.length > 0 ? `${negative ? '-' : ''}${intPart}.${fracPart}` : `${negative ? '-' : ''}${intPart}`;
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function buildCsv(subscribers: Subscriber[]): string {
  const header = ['Subscriber Address', 'Token Symbol', 'Token Address', 'Raw Amount', 'Formatted Amount', 'Status'];
  const rows = subscribers.map((s) => [
    s.address, s.tokenSymbol, s.tokenAddress,
    typeof s.rawAmount === 'bigint' ? s.rawAmount.toString() : s.rawAmount.trim(),
    `${formatAmount(s.rawAmount, s.decimals)} ${s.tokenSymbol}`,
    s.status,
  ]);
  return [header, ...rows].map((row) => row.map((f) => escapeCsvField(String(f))).join(',')).join('\r\n');
}

function TokenSymbol({ tokenAddress }: { tokenAddress: string }) {
  const { data } = useToken(tokenAddress);
  return <>{data?.symbol ?? `${tokenAddress.slice(0, 4)}…${tokenAddress.slice(-4)}`}</>;
}

export default function SubscriberTable({ subscribers, fileName = 'subscribers.csv', network }: SubscriberTableProps) {
  const wallet = useContext(WalletContext);
  const notesNetwork = network ?? wallet?.network ?? 'testnet';
  const { getNote, setNote } = useSubscriptionNotes(notesNetwork);

  const rows = useMemo(
    () => subscribers.map((s) => ({
      ...s,
      formattedDisplay: `${formatAmount(s.rawAmount, s.decimals)} ${s.tokenSymbol}`,
    })),
    [subscribers],
  );

  const handleDownloadCsv = useCallback(() => {
    const csv = buildCsv(subscribers);
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = fileName; link.style.display = 'none';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [subscribers, fileName]);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button type="button" onClick={handleDownloadCsv} disabled={subscribers.length === 0} className="btn-secondary text-sm">
          Download CSV
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted">
            <th scope="col" className="pb-2 pr-4">Subscriber</th>
            <th scope="col" className="pb-2 pr-4">Amount</th>
            <th scope="col" className="pb-2 pr-4">Status</th>
            <th scope="col" className="pb-2">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className="py-6 text-center text-muted">No subscribers yet.</td></tr>
          ) : (
            rows.map((row) => {
              const noteKey = row.id ?? `${row.address}-${row.tokenAddress}`;
              return (
                <tr key={`${row.address}-${row.tokenAddress}`} className="border-t border-line">
                  <td className="py-2 pr-4 font-mono text-xs text-fg">{row.address}</td>
                  <td className="py-2 pr-4 text-fg">{row.formattedDisplay}</td>
                  <td className="py-2 pr-4 text-fg">{row.status}</td>
                  <td className="py-2">
                    <input
                      key={`${notesNetwork}:${noteKey}`}
                      type="text"
                      defaultValue={getNote(String(noteKey))}
                      onBlur={(e) => setNote(String(noteKey), e.target.value)}
                      placeholder="Add a note"
                      aria-label={`Note for subscriber ${row.address}`}
                      className="w-full min-w-40 rounded border border-line bg-surface px-2 py-1 text-sm"
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
