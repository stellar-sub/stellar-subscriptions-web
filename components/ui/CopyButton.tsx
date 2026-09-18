"use client";

import { useEffect, useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded px-1.5 py-0.5 text-xs text-muted transition hover:bg-raised hover:text-fg"
      aria-label={copied ? "Copied" : `${label} ${value}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
