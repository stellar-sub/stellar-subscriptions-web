'use client';

import { useEffect, useMemo, useState } from 'react';
import { TxProgress } from '@/components/tx/TxProgress';
import { TokenSelect } from '@/components/plan/TokenSelect';
import { useTx } from '@/hooks/useTx';
import { PLAN_ERRORS } from '@/lib/errors';
import { nativeTokenId, type TokenInfo } from '@/lib/contracts';

export interface CreatePlanFormProps {
  /** Called after the create-plan transaction succeeds. */
  onCreated?: (planId: string) => void;
}

interface TokenSelection {
  tokenId: string;
  info: TokenInfo | null;
  error: string | null;
}

const DEFAULT_CHARGES = 12;

function formatAmount(raw: bigint, decimals: number): string {
  if (decimals <= 0) return raw.toString();
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  const sign = negative ? '-' : '';
  return fracStr.length > 0 ? `${sign}${whole}.${fracStr}` : `${sign}${whole}`;
}

function parseAmount(input: string, decimals: number): bigint | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  if (!/^\d*\.?\d*$/.test(trimmed)) return null;
  const [wholePart, fracPart = ''] = trimmed.split('.');
  if (fracPart.length > decimals) return null;
  const whole = wholePart === '' ? 0n : BigInt(wholePart);
  const frac = fracPart === '' ? 0n : BigInt(fracPart.padEnd(decimals, '0'));
  return whole * 10n ** BigInt(decimals) + frac;
}

export function CreatePlanForm({ onCreated }: CreatePlanFormProps) {
  const [token, setToken] = useState<TokenSelection>({
    tokenId: nativeTokenId,
    info: null,
    error: null,
  });
  const [amountInput, setAmountInput] = useState('');
  const [chargesInput, setChargesInput] = useState(String(DEFAULT_CHARGES));
  const [periodInput, setPeriodInput] = useState('30');
  const [merchant, setMerchant] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { run, phase, error, reset } = useTx();

  const decimals = token.info?.decimals ?? 7;

  const amountPerPeriod = useMemo(
    () => parseAmount(amountInput, decimals),
    [amountInput, decimals],
  );

  const charges = useMemo(() => {
    const trimmed = chargesInput.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const value = Number(trimmed);
    if (!Number.isSafeInteger(value) || value <= 0) return null;
    return value;
  }, [chargesInput]);

  const defaultCap = useMemo(() => {
    if (amountPerPeriod === null || charges === null) return null;
    return amountPerPeriod * BigInt(charges);
  }, [amountPerPeriod, charges]);

  const periodDays = useMemo(() => {
    const trimmed = periodInput.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const value = Number(trimmed);
    if (!Number.isSafeInteger(value) || value <= 0) return null;
    return value;
  }, [periodInput]);

  // Keep the amount input in sync when the token's decimals change.
  useEffect(() => {
    if (amountPerPeriod === null && amountInput.trim() !== '') {
      // Re-parse against new decimals; if it no longer parses, clear it.
      const reparsed = parseAmount(amountInput, decimals);
      if (reparsed === null) setAmountInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decimals]);

  const tokenBlocked = token.error !== null || token.info === null;

  const canSubmit =
    !tokenBlocked &&
    amountPerPeriod !== null &&
    amountPerPeriod > 0n &&
    charges !== null &&
    periodDays !== null &&
    merchant.trim() !== '' &&
    phase !== 'signing' &&
    phase !== 'submitting';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    reset();

    if (tokenBlocked) {
      setFormError(
        token.error ??
          'This token could not be read. Choose another token before creating a plan.',
      );
      return;
    }
    if (amountPerPeriod === null || amountPerPeriod <= 0n) {
      setFormError('Enter an amount per charge greater than zero.');
      return;
    }
    if (charges === null) {
      setFormError('Enter a whole number of charges greater than zero.');
      return;
    }
    if (periodDays === null) {
      setFormError('Enter a billing period of at least one day.');
      return;
    }
    if (defaultCap === null) {
      setFormError('The cap could not be computed. Check the amount and number of charges.');
      return;
    }
    if (merchant.trim() === '') {
      setFormError('Enter the merchant address that will receive charges.');
      return;
    }

    try {
      const result = await run({
        contractErrors: PLAN_ERRORS,
        build: async (client) =>
          client.createPlan({
            merchant: merchant.trim(),
            token: token.tokenId,
            amountPerPeriod,
            periodDays,
            defaultCap,
          }),
      });
      if (result && typeof result === 'object' && 'planId' in result) {
        onCreated?.(String((result as { planId: unknown }).planId));
      }
    } catch {
      // Errors are surfaced through `error` from useTx.
    }
  };

  const displayCap =
    defaultCap !== null ? formatAmount(defaultCap, decimals) : '—';
  const displayAmount =
    amountPerPeriod !== null ? formatAmount(amountPerPeriod, decimals) : '—';
  const symbol = token.info?.symbol ?? '';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <TokenSelect
        value={token.tokenId}
        onChange={(selection) =>
          setToken({
            tokenId: selection.tokenId,
            info: selection.info,
            error: selection.error,
          })
        }
      />

      {tokenBlocked && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {token.error ??
            'This token could not be read. Choose another token before creating a plan.'}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="merchant" className="text-sm font-medium">
          Merchant address
        </label>
        <input
          id="merchant"
          type="text"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="G..."
          className="rounded-md border px-3 py-2 font-mono text-sm"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="amount" className="text-sm font-medium">
          Amount per charge {symbol ? `(${symbol})` : ''}
        </label>
        <input
          id="amount"
          type="text"
          inputMode="decimal"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          placeholder="0.00"
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="charges" className="text-sm font-medium">
          Number of charges
        </label>
        <input
          id="charges"
          type="number"
          min={1}
          step={1}
          value={chargesInput}
          onChange={(e) => setChargesInput(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-600">
          The cap is {charges ?? '—'} charges × {displayAmount} {symbol} ={' '}
          <span className="font-medium">
            {displayCap} {symbol}
          </span>
          . The contract will never charge more than this cap, and never off
          schedule.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="period" className="text-sm font-medium">
          Billing period (days)
        </label>
        <input
          id="period"
          type="number"
          min={1}
          step={1}
          value={periodInput}
          onChange={(e) => setPeriodInput(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-md border bg-gray-50 p-3 text-sm">
        <div className="flex justify-between">
          <span>Amount per charge</span>
          <span className="font-medium">
            {displayAmount} {symbol}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Number of charges</span>
          <span className="font-medium">{charges ?? '—'}</span>
        </div>
        <div className="flex justify-between">
          <span>Default cap</span>
          <span className="font-medium">
            {displayCap} {symbol}
          </span>
        </div>
      </div>

      {formError && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {formError}
        </p>
      )}

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <TxProgress phase={phase} />

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Create plan
      </button>
    </form>
  );
}

export default CreatePlanForm;