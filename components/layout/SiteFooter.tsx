"use client";

import { useWallet } from "@/hooks/useWallet";
import { contractsFor } from "@/lib/contracts";
import { shortAddress } from "@/lib/format";
import { NETWORKS, explorerContractUrl } from "@/lib/stellar";

const ORG = process.env.NEXT_PUBLIC_GITHUB_ORG ?? "stellar-sub";
const REPOS = [
  { name: "stellar-subscriptions-contracts", label: "Contracts" },
  { name: "stellar-subscriptions-api-docs", label: "API + Docs" },
  { name: "stellar-subscriptions-web", label: "This app" },
];

export function SiteFooter() {
  const { network } = useWallet();
  const deployed = contractsFor(network);

  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-page gap-8 px-4 py-10 text-sm sm:grid-cols-3 sm:px-6">
        <div className="space-y-2">
          <p className="font-semibold text-fg">Stellar Subscriptions</p>
          <p className="text-muted">
            The cap, the billing interval and cancellation are enforced by the smart contract, not by this
            website. No one — including us — can charge you outside what you authorized.
          </p>
        </div>

        <div className="space-y-2">
          <p className="font-semibold text-fg">Contracts on {NETWORKS[network].label}</p>
          {deployed ? (
            <ul className="space-y-1 text-muted">
              {(["subscription", "plan", "registry"] as const).map((key) => (
                <li key={key} className="flex justify-between gap-4">
                  <span className="capitalize">{key}</span>
                  <a
                    href={explorerContractUrl(network, deployed[key])}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono hover:text-fg"
                  >
                    {shortAddress(deployed[key], 6)}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Not deployed on this network.</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="font-semibold text-fg">Source</p>
          <ul className="space-y-1 text-muted">
            {REPOS.map((repo) => (
              <li key={repo.name}>
                {ORG ? (
                  <a href={`https://github.com/${ORG}/${repo.name}`} target="_blank" rel="noreferrer" className="hover:text-fg">
                    {repo.label}
                  </a>
                ) : (
                  <span>
                    {repo.label}: <span className="font-mono">{repo.name}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
