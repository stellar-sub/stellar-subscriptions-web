"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { shortAddress } from "@/lib/format";
import { CopyButton } from "@/components/ui/CopyButton";
import { Spinner } from "@/components/ui/Spinner";

export function ConnectButton() {
  const { address, installed, connecting, error, connect, disconnect } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  if (address) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className="btn-secondary font-mono"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span aria-hidden className="h-2 w-2 rounded-full bg-ok" />
          {shortAddress(address)}
        </button>
        {menuOpen && (
          <div role="menu" className="card absolute right-0 mt-2 w-64 space-y-3 p-3 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-xs text-muted" title={address}>
                {address}
              </span>
              <CopyButton value={address} />
            </div>
            <button
              type="button"
              role="menuitem"
              className="btn-secondary w-full"
              onClick={() => {
                disconnect();
                setMenuOpen(false);
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!installed) {
    return (
      <a href="https://freighter.app" target="_blank" rel="noreferrer" className="btn-primary">
        Install Freighter
      </a>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <button type="button" className="btn-primary" onClick={() => void connect()} disabled={connecting}>
        {connecting && <Spinner label="Connecting" />}
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
      {error && (
        <p role="alert" className="absolute top-full mt-1 max-w-xs text-right text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
