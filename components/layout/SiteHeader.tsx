"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { NetworkSelector } from "@/components/wallet/NetworkSelector";
import { ThemeToggle } from "./ThemeToggle";
import { useWallet } from "@/hooks/useWallet";
import { useMerchantSubscriptions } from "@/hooks/useSubscriptions";
import { useLedger } from "@/hooks/useLedger";
import { isDueByLedger } from "@/lib/subscription";

const NON_MERCHANT_NAV = [
  { href: "/plans", label: "Plans" },
  { href: "/subscriptions", label: "My subscriptions" },
];

/** Badge showing the number of subscriptions due for charge, capped at "99+". */
function DueBadge({ count }: { count: number }) {
  if (count === 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      aria-label={`${count > 99 ? "More than 99" : count} charge${count === 1 ? "" : "s"} due`}
      className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold leading-none text-brand-fg"
    >
      {label}
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { address, network } = useWallet();

  // Fetch merchant subscriptions for the connected address.
  // Returns no data when disconnected or the address has no merchant subs.
  const merchantSubs = useMerchantSubscriptions(address);
  const ledger = useLedger(network);

  // Count subscriptions due for charge using the shared ledger clock.
  const dueCount =
    merchantSubs.data && ledger.sequence !== null
      ? merchantSubs.data.filter((sub) => isDueByLedger(sub, ledger.sequence!))
          .length
      : 0;

  const isActive = (href: string) =>
    !!pathname && (pathname === href || pathname.startsWith(`${href}/`));

  const navLinkClass = (href: string) =>
    `rounded-lg px-3 py-2 text-sm transition ${
      isActive(href) ? "bg-raised text-fg" : "text-muted hover:text-fg"
    }`;

  const nonMerchantLinks = NON_MERCHANT_NAV.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={navLinkClass(item.href)}
    >
      {item.label}
    </Link>
  ));

  const merchantLink = (
    <Link
      key="/merchant"
      href="/merchant"
      onClick={() => setOpen(false)}
      aria-current={isActive("/merchant") ? "page" : undefined}
      className={`${navLinkClass("/merchant")} inline-flex items-center`}
    >
      Merchant
      <DueBadge count={dueCount} />
    </Link>
  );

  const allLinks = [...nonMerchantLinks, merchantLink];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-page items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-fg">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-fg"
          >
            ↻
          </span>
          <span className="hidden sm:inline">Stellar Subscriptions</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {allLinks}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <NetworkSelector />
          </div>
          <ConnectButton />
          <ThemeToggle />
          <button
            type="button"
            className="btn-secondary px-3 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="flex flex-col gap-1 border-t border-line px-4 py-3 md:hidden"
        >
          {allLinks}
          <div className="pt-2 sm:hidden">
            <NetworkSelector />
          </div>
        </nav>
      )}
    </header>
  );
}
