"use client";

import { useWallet } from "@/hooks/useWallet";
import { shortAddress } from "@/lib/format";
import { explorerAccountUrl, explorerContractUrl } from "@/lib/stellar";
import { CopyButton } from "./CopyButton";

/** A shortened account or contract id linking to the explorer, with copy. */
export function AddressLink({ address, you }: { address: string; you?: boolean }) {
  const { network } = useWallet();
  const href = address.startsWith("C")
    ? explorerContractUrl(network, address)
    : explorerAccountUrl(network, address);
  return (
    <span className="inline-flex items-center gap-1">
      <a href={href} target="_blank" rel="noreferrer" className="font-mono text-sm text-fg underline-offset-2 hover:underline" title={address}>
        {shortAddress(address)}
      </a>
      {you && <span className="text-xs text-muted">(you)</span>}
      <CopyButton value={address} />
    </span>
  );
}
