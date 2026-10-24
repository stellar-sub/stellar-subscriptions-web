'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { nativeTokenId, getTokenInfo } from '@/lib/contracts';

export type TokenSelectMode = 'native' | 'custom';

export interface TokenInfo {
  symbol: string;
  decimals: number;
}

export interface TokenSelectValue {
  /** The selected token contract id (native XLM id or a pasted contract id). */
  tokenId: string;
  /** Whether the pasted contract id is malformed (rejected before any network call). */
  invalid: boolean;
  /** Whether the token could not be read via getTokenInfo. */
  unreadable: boolean;
  /** Resolved token info, when readable. */
  info: TokenInfo | null;
}

export interface TokenSelectProps {
  /** The network the plan is billed on (e.g. 'testnet' | 'mainnet'). */
  network: string;
  /** Controlled selected token id. */
  value?: string;
  /** Called whenever the selection or its validity changes. */
  onChange?: (value: TokenSelectValue) => void;
  /** Optional label override. */
  label?: string;
  /** Disable the control. */
  disabled?: boolean;
}

/**
 * Validates a Stellar contract id (StrKey format: starts with 'C', 56 chars,
 * base32 alphabet). This is a purely local check — no network call is made.
 */
export function isValidContractId(id: string): boolean {
  if (typeof id !== 'string') return false;
  const trimmed = id.trim();
  if (trimmed.length !== 56) return false;
  if (!trimmed.startsWith('C')) return false;
  // StrKey uses uppercase base32 (A-Z, 2-7).
  return /^[A-Z2-7]{56}$/.test(trimmed);
}

interface UseTokenResult {
  info: TokenInfo | null;
  loading: boolean;
  error: string | null;
}

/**
 * Reads token symbol/decimals via getTokenInfo. Skips the network call entirely
 * when the id is malformed.
 */
export function useToken(tokenId: string | null): UseTokenResult {
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!tokenId) {
      setInfo(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Reject malformed ids before any network call.
    if (!isValidContractId(tokenId)) {
      setInfo(null);
      setLoading(false);
      setError('Not a valid contract id.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    getTokenInfo(tokenId)
      .then((result) => {
        if (cancelled) return;
        if (!result || typeof result.symbol !== 'string' || typeof result.decimals !== 'number') {
          setInfo(null);
          setError('This token could not be read. Check the contract id and network.');
          return;
        }
        setInfo({ symbol: result.symbol, decimals: result.decimals });
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setInfo(null);
        setError('This token could not be read. Check the contract id and network.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  return { info, loading, error };
}

export default function TokenSelect({
  network,
  value,
  onChange,
  label = 'Billing token',
  disabled = false,
}: TokenSelectProps) {
  const nativeId = useMemo(() => nativeTokenId(network), [network]);
  const fieldId = useId();

  const [mode, setMode] = useState<TokenSelectMode>(() =>
    value && value !== nativeId ? 'custom' : 'native',
  );
  const [pasted, setPasted] = useState<string>(() =>
    value && value !== nativeId ? value : '',
  );

  // Keep internal mode in sync if the controlled value changes externally.
  useEffect(() => {
    if (!value) return;
    if (value === nativeId) {
      setMode('native');
    } else {
      setMode('custom');
      setPasted(value);
    }
  }, [value, nativeId]);

  const trimmedPasted = pasted.trim();
  const pastedInvalid = mode === 'custom' && trimmedPasted.length > 0 && !isValidContractId(trimmedPasted);

  // Only attempt to read a token when the id is well-formed.
  const tokenToRead =
    mode === 'native'
      ? nativeId
      : trimmedPasted.length > 0 && isValidContractId(trimmedPasted)
        ? trimmedPasted
        : null;

  const { info, loading, error } = useToken(tokenToRead);

  const unreadable = mode === 'custom' && tokenToRead !== null && !loading && error !== null;
  const invalid = pastedInvalid;

  const selectedTokenId = mode === 'native' ? nativeId : trimmedPasted;

  // Notify the parent of the current selection and its validity.
  useEffect(() => {
    if (!onChange) return;
    onChange({
      tokenId: selectedTokenId,
      invalid,
      unreadable,
      info,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTokenId, invalid, unreadable, info?.symbol, info?.decimals]);

  const handleModeChange = (next: TokenSelectMode) => {
    if (disabled) return;
    setMode(next);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasted(e.target.value);
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-gray-900">{label}</span>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="radio"
            name={`${fieldId}-mode`}
            value="native"
            checked={mode === 'native'}
            onChange={() => handleModeChange('native')}
            disabled={disabled}
          />
          <span>
            Native XLM <span className="text-gray-500">(default)</span>
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="radio"
            name={`${fieldId}-mode`}
            value="custom"
            checked={mode === 'custom'}
            onChange={() => handleModeChange('custom')}
            disabled={disabled}
          />
          <span>Paste a token contract id</span>
        </label>
      </div>

      {mode === 'custom' && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${fieldId}-contract`} className="text-xs text-gray-600">
            SEP-41 token contract id
          </label>
          <input
            id={`${fieldId}-contract`}
            type="text"
            value={pasted}
            onChange={handlePasteChange}
            disabled={disabled}
            placeholder="C..."
            spellCheck={false}
            autoComplete="off"
            className={`w-full rounded-md border px-3 py-2 font-mono text-sm ${
              invalid ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-invalid={invalid}
            aria-describedby={`${fieldId}-status`}
          />
        </div>
      )}

      <div id={`${fieldId}-status`} aria-live="polite" className="text-sm">
        {mode === 'native' && (
          <p className="text-gray-600">
            Plans are billed in native XLM. Charges follow the plan schedule and never exceed the
            approved cap.
          </p>
        )}

        {mode === 'custom' && trimmedPasted.length === 0 && (
          <p className="text-gray-600">Paste a SEP-41 token contract id to bill in that token.</p>
        )}

        {invalid && (
          <p className="text-red-600">
            That is not a valid contract id. Contract ids start with &quot;C&quot; and are 56
            characters long.
          </p>
        )}

        {mode === 'custom' && tokenToRead && loading && (
          <p className="text-gray-600">Reading token…</p>
        )}

        {mode === 'custom' && tokenToRead && !loading && info && (
          <p className="text-gray-800">
            Token: <span className="font-medium">{info.symbol}</span>{' '}
            <span className="text-gray-500">({info.decimals} decimals)</span>
          </p>
        )}

        {unreadable && (
          <p className="text-red-600">
            This token could not be read, so a plan cannot be created with it. Check the contract id
            and that it is a SEP-41 token on this network.
          </p>
        )}
      </div>
    </div>
  );
}