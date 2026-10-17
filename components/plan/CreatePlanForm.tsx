"use client";

import { useMemo, useState } from "react";
import {
  createPlan,
  parseAmount,
  describeInterval,
  approxDuration,
  INTERVAL_PRESETS,
  nativeTokenId,
  type IntervalPreset,
} from "@/lib/contracts";
import { useToken } from "@/hooks/useToken";
import { useTx } from "@/hooks/useTx";

export interface CreatePlanFormProps {
  onCreated?: (id: string) => void;
}

interface FormState {
  name: string;
  token: string;
  amount: string;
  intervalPreset: string;
  customInterval: string;
  cap: string;
}

interface FormErrors {
  name?: string;
  token?: string;
  amount?: string;
  interval?: string;
  cap?: string;
}

const NAME_MAX_BYTES = 64;

function byteLength(value: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value).length;
  }
  // Fallback: count UTF-8 bytes manually.
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

function isPositiveIntegerString(value: string): boolean {
  return /^[1-9][0-9]*$/.test(value.trim());
}

export default function CreatePlanForm({ onCreated }: CreatePlanFormProps) {
  const [form, setForm] = useState<FormState>({
    name: "",
    token: nativeTokenId,
    amount: "",
    intervalPreset: String(INTERVAL_PRESETS[0]?.ledgers ?? ""),
    customInterval: "",
    cap: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { token, decimals, loading: tokenLoading } = useToken(form.token);
  const { run, pending } = useTx();

  const intervalLedgers = useMemo(() => {
    if (form.intervalPreset === "custom") {
      return form.customInterval.trim();
    }
    return form.intervalPreset;
  }, [form.intervalPreset, form.customInterval]);

  const errors = useMemo<FormErrors>(() => {
    const next: FormErrors = {};

    // Name: 1 to 64 bytes.
    const nameBytes = byteLength(form.name);
    if (nameBytes === 0) {
      next.name = "Name is required.";
    } else if (nameBytes > NAME_MAX_BYTES) {
      next.name = `Name must be at most ${NAME_MAX_BYTES} bytes.`;
    }

    // Token.
    if (!form.token.trim()) {
      next.token = "Token is required.";
    }

    // Amount: must parse and be above zero.
    if (!form.amount.trim()) {
      next.amount = "Amount is required.";
    } else if (decimals != null) {
      try {
        const raw = parseAmount(form.amount, decimals);
        if (raw <= 0n) {
          next.amount = "Amount must be greater than zero.";
        }
      } catch {
        next.amount = "Amount must be a valid decimal number.";
      }
    }

    // Interval: at least one ledger.
    if (!intervalLedgers) {
      next.interval = "Interval is required.";
    } else if (!isPositiveIntegerString(intervalLedgers)) {
      next.interval = "Interval must be a whole number of ledgers.";
    } else if (BigInt(intervalLedgers) < 1n) {
      next.interval = "Interval must be at least one ledger.";
    }

    // Cap: at least one period (>= interval).
    if (!form.cap.trim()) {
      next.cap = "Default cap is required.";
    } else if (decimals != null) {
      try {
        const capRaw = parseAmount(form.cap, decimals);
        if (capRaw <= 0n) {
          next.cap = "Cap must be greater than zero.";
        } else if (isPositiveIntegerString(intervalLedgers)) {
          const amountRaw = form.amount.trim()
            ? (() => {
                try {
                  return parseAmount(form.amount, decimals);
                } catch {
                  return null;
                }
              })()
            : null;
          if (amountRaw != null && amountRaw > 0n) {
            // Cap must cover at least one period's charge.
            if (capRaw < amountRaw) {
              next.cap = "Cap must be at least one period's amount.";
            }
          }
        }
      } catch {
        next.cap = "Cap must be a valid decimal number.";
      }
    }

    return next;
  }, [form, decimals, intervalLedgers]);

  const isValid = Object.keys(errors).length === 0 && decimals != null && !tokenLoading;

  const showError = (key: keyof FormErrors): string | undefined => {
    if (submitted || form[key as keyof FormState] !== undefined) {
      return errors[key];
    }
    return errors[key];
  };

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSubmitError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setSubmitError(null);

    if (!isValid || decimals == null) {
      return;
    }

    try {
      const amountRaw = parseAmount(form.amount, decimals);
      const capRaw = parseAmount(form.cap, decimals);
      const interval = BigInt(intervalLedgers);

      const id = await run(() =>
        createPlan({
          name: form.name,
          token: form.token,
          amount: amountRaw,
          interval,
          cap: capRaw,
        }),
      );

      if (id != null) {
        onCreated?.(String(id));
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create plan.");
    }
  };

  // Subscriber-facing summary.
  const summary = useMemo(() => {
    if (decimals == null) return null;
    let amountRaw: bigint | null = null;
    let capRaw: bigint | null = null;
    try {
      if (form.amount.trim()) amountRaw = parseAmount(form.amount, decimals);
    } catch {
      amountRaw = null;
    }
    try {
      if (form.cap.trim()) capRaw = parseAmount(form.cap, decimals);
    } catch {
      capRaw = null;
    }
    const interval = isPositiveIntegerString(intervalLedgers) ? BigInt(intervalLedgers) : null;

    let maxCharges: bigint | null = null;
    if (amountRaw != null && amountRaw > 0n && capRaw != null && capRaw > 0n) {
      maxCharges = capRaw / amountRaw;
    }

    return {
      amountRaw,
      capRaw,
      interval,
      maxCharges,
      intervalLabel: interval != null ? describeInterval(interval) : null,
      durationLabel: interval != null ? approxDuration(interval) : null,
      symbol: token?.symbol ?? form.token,
    };
  }, [form.amount, form.cap, intervalLedgers, decimals, token, form.token]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="plan-name">Plan name</label>
        <input
          id="plan-name"
          type="text"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          aria-invalid={Boolean(showError("name"))}
          aria-describedby={showError("name") ? "plan-name-error" : undefined}
        />
        {showError("name") && (
          <p id="plan-name-error" role="alert" className="text-sm text-red-600">
            {showError("name")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="plan-token">Token</label>
        <input
          id="plan-token"
          type="text"
          value={form.token}
          onChange={(e) => update("token", e.target.value)}
          aria-invalid={Boolean(showError("token"))}
          aria-describedby={showError("token") ? "plan-token-error" : undefined}
        />
        {showError("token") && (
          <p id="plan-token-error" role="alert" className="text-sm text-red-600">
            {showError("token")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="plan-amount">Amount per period</label>
        <input
          id="plan-amount"
          type="text"
          inputMode="decimal"
          value={form.amount}
          onChange={(e) => update("amount", e.target.value)}
          aria-invalid={Boolean(showError("amount"))}
          aria-describedby={showError("amount") ? "plan-amount-error" : undefined}
        />
        {showError("amount") && (
          <p id="plan-amount-error" role="alert" className="text-sm text-red-600">
            {showError("amount")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="plan-interval">Interval</label>
        <select
          id="plan-interval"
          value={form.intervalPreset}
          onChange={(e) => update("intervalPreset", e.target.value)}
          aria-invalid={Boolean(showError("interval"))}
          aria-describedby={showError("interval") ? "plan-interval-error" : undefined}
        >
          {INTERVAL_PRESETS.map((preset: IntervalPreset) => (
            <option key={preset.ledgers} value={String(preset.ledgers)}>
              {preset.label}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>
        {form.intervalPreset === "custom" && (
          <input
            id="plan-interval-custom"
            type="text"
            inputMode="numeric"
            placeholder="Ledgers"
            value={form.customInterval}
            onChange={(e) => update("customInterval", e.target.value)}
            aria-label="Custom interval in ledgers"
            aria-invalid={Boolean(showError("interval"))}
          />
        )}
        {showError("interval") && (
          <p id="plan-interval-error" role="alert" className="text-sm text-red-600">
            {showError("interval")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="plan-cap">Default cap</label>
        <input
          id="plan-cap"
          type="text"
          inputMode="decimal"
          value={form.cap}
          onChange={(e) => update("cap", e.target.value)}
          aria-invalid={Boolean(showError("cap"))}
          aria-describedby={showError("cap") ? "plan-cap-error" : undefined}
        />
        {showError("cap") && (
          <p id="plan-cap-error" role="alert" className="text-sm text-red-600">
            {showError("cap")}
          </p>
        )}
      </div>

      {summary && (
        <section aria-label="Subscriber summary" className="rounded border p-3">
          <h3 className="font-semibold">What subscribers will see</h3>
          <ul className="list-disc pl-5 text-sm">
            <li>
              Amount per charge:{" "}
              {summary.amountRaw != null
                ? `${summary.amountRaw.toString()} raw units (${form.amount} ${summary.symbol})`
                : "—"}
            </li>
            <li>
              Interval:{" "}
              {summary.intervalLabel
                ? `${summary.intervalLabel} (~${summary.durationLabel})`
                : "—"}
            </li>
            <li>
              Suggested cap:{" "}
              {summary.capRaw != null
                ? `${summary.capRaw.toString()} raw units (${form.cap} ${summary.symbol})`
                : "—"}
            </li>
            <li>
              Max charges: {summary.maxCharges != null ? summary.maxCharges.toString() : "—"}
            </li>
          </ul>
          <p className="mt-2 text-sm text-gray-700">
            The merchant can charge at most once per interval and never more than the cap.
          </p>
        </section>
      )}

      {submitError && (
        <p role="alert" className="text-sm text-red-600">
          {submitError}
        </p>
      )}

      <button type="submit" disabled={!isValid || pending}>
        {pending ? "Creating…" : "Create plan"}
      </button>
    </form>
  );
}