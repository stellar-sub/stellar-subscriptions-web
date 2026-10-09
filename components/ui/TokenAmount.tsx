"use client";

import { useToken } from "@/hooks/useToken";
import { formatAmount } from "@/lib/format";

/** An amount of `token`, formatted with its own decimals and symbol. */
export function TokenAmount({ token, value, className = "" }: { token: string; value: bigint; className?: string }) {
  const { data: info, error } = useToken(token);
  if (error) {
    return (
      <span className={`tabular-nums ${className}`} title="Token details unavailable; showing raw units">
        {value.toLocaleString("en-US")} units
      </span>
    );
  }
  if (!info) return <span className={`text-muted ${className}`}>…</span>;
  return (
    <span className={`tabular-nums ${className}`}>
      {formatAmount(value, info.decimals)} {info.symbol}
    </span>
  );
}
