"use client";

import type { ReactNode } from "react";
import { useWallet } from "@/hooks/useWallet";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";

/** Renders `children` with the connected address, or a prompt to connect. */
export function RequireWallet({
  purpose,
  children,
}: {
  purpose: string;
  children: (address: string) => ReactNode;
}) {
  const { address, installed, connecting, error, connect } = useWallet();

  if (address) return <>{children(address)}</>;

  return (
    <EmptyState
      title="Connect your wallet"
      description={`Connect Freighter to ${purpose}. This only reads your public address — nothing is signed until you confirm an action.`}
      action={
        installed ? (
          <div className="flex flex-col items-center gap-2">
            <button type="button" className="btn-primary" onClick={() => void connect()} disabled={connecting}>
              {connecting && <Spinner label="Connecting" />}
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        ) : (
          <a href="https://freighter.app" target="_blank" rel="noreferrer" className="btn-primary">
            Install Freighter
          </a>
        )
      }
    />
  );
}
