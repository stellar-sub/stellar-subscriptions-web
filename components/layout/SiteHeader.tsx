"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { NetworkSelector } from "@/components/wallet/NetworkSelector";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/plans", label: "Plans" },
  { href: "/subscriptions", label: "My subscriptions" },
  { href: "/merchant", label: "Merchant" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const links = NAV.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={() => setOpen(false)}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={`rounded-lg px-3 py-2 text-sm transition ${
        isActive(item.href) ? "bg-raised text-fg" : "text-muted hover:text-fg"
      }`}
    >
      {item.label}
    </Link>
  ));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-page items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-fg">
          <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-fg">
            ↻
          </span>
          <span className="hidden sm:inline">Stellar Subscriptions</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links}
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
        <nav id="mobile-nav" aria-label="Main" className="flex flex-col gap-1 border-t border-line px-4 py-3 md:hidden">
          {links}
          <div className="pt-2 sm:hidden">
            <NetworkSelector />
          </div>
        </nav>
      )}
    </header>
  );
}
