"use client";

import { useEffect, useState } from "react";
import { formatAmount, maxCharges, parseAmount, pluralize, unchargeableRemainder } from "@/lib/format";
import type { TokenInfo } from "@/types";

export interface CapChoice {
  /** The chosen cap in raw units, or null while the custom entry is invalid. */
  cap: bigint | null;
  error: string | null;
}

/**
 * Choose the total spending cap: the merchant's suggestion, or your own.
 * Every option shows how many charges it allows, so the number is never
 * abstract.
 */
export function CapSelector({
  amountPerPeriod,
  defaultCap,
  token,
  onChange,
}: {
  amountPerPeriod: bigint;
  defaultCap: bigint;
  token: TokenInfo;
  onChange: (choice: CapChoice) => void;
}) {
  const [mode, setMode] = useState<"default" | "custom">("default");
  const [custom, setCustom] = useState("");

  const customCap = parseAmount(custom, token.decimals);
  const customError =
    mode !== "custom"
      ? null
      : custom.trim() === ""
        ? "Enter a cap."
        : customCap === null
          ? `Enter a positive amount with at most ${token.decimals} decimal places.`
          : customCap < amountPerPeriod
            ? `The cap must cover at least one charge of ${formatAmount(amountPerPeriod, token.decimals)} ${token.symbol}.`
            : null;
  const cap = mode === "default" ? defaultCap : customError ? null : customCap;
  const example = formatAmount(amountPerPeriod * 3n, token.decimals);

  useEffect(() => {
    onChange({ cap, error: customError });
  }, [cap, customError, onChange]);

  const describe = (value: bigint) => {
    const remainder = unchargeableRemainder(value, amountPerPeriod);
    return (
      <>
        at most {pluralize(maxCharges(value, amountPerPeriod), "charge")}
        {remainder > 0n && (
          <>
            {" "}
            · the last {formatAmount(remainder, token.decimals)} {token.symbol} can never be charged
          </>
        )}
      </>
    );
  };

  return (
    <fieldset className="space-y-3">
      <legend className="label">Your spending cap</legend>
      <p className="text-sm text-muted">
        The most this subscription can ever take from you, in total. You can always cancel sooner.
      </p>

      <label className={`card flex cursor-pointer items-start gap-3 p-4 ${mode === "default" ? "border-brand/60" : ""}`}>
        <input
          type="radio"
          name="cap"
          className="mt-1 accent-[rgb(var(--brand))]"
          checked={mode === "default"}
          onChange={() => setMode("default")}
        />
        <span>
          <span className="block font-medium text-fg">
            Suggested: {formatAmount(defaultCap, token.decimals)} {token.symbol}
          </span>
          <span className="block text-sm text-muted">{describe(defaultCap)}</span>
        </span>
      </label>

      <label className={`card flex cursor-pointer items-start gap-3 p-4 ${mode === "custom" ? "border-brand/60" : ""}`}>
        <input
          type="radio"
          name="cap"
          className="mt-1 accent-[rgb(var(--brand))]"
          checked={mode === "custom"}
          onChange={() => setMode("custom")}
        />
        <span className="flex-1 space-y-2">
          <span className="block font-medium text-fg">Choose my own cap</span>
          {mode === "custom" && (
            <>
              <span className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder={example}
                  aria-label={`Custom cap in ${token.symbol}`}
                  aria-invalid={Boolean(customError)}
                  className="input max-w-[12rem]"
                />
                <span className="text-sm text-muted">{token.symbol}</span>
              </span>
              {customError ? (
                <span role="alert" className="block text-sm text-danger">
                  {customError}
                </span>
              ) : (
                customCap !== null && <span className="block text-sm text-muted">{describe(customCap)}</span>
              )}
            </>
          )}
        </span>
      </label>
    </fieldset>
  );
}
