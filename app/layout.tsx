import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { NetworkNotice } from "@/components/layout/NetworkNotice";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { WalletProvider } from "@/components/wallet/WalletProvider";

export const metadata: Metadata = {
  title: { default: "Stellar Subscriptions", template: "%s · Stellar Subscriptions" },
  description:
    "Recurring payments on Stellar, on your terms. Authorize a spending cap once, cancel anytime — a merchant can never charge more than you approved.",
};

export const viewport: Viewport = {
  themeColor: "#090b10",
  colorScheme: "dark light",
};

/**
 * Applies the saved theme choice before first paint, so dark never flashes.
 * Dark stays the default for new visitors; "system" follows prefers-color-scheme.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem("subs.theme");var d=t==="light"?false:t==="system"?!(window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches):true;if(d)document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* The sole permitted dangerouslySetInnerHTML: a constant script, never user input. Any other use fails lint. */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <WalletProvider>
          <ToastProvider>
            <div className="flex min-h-screen flex-col">
              <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-brand focus:px-3 focus:py-2 focus:text-brand-fg">
                Skip to content
              </a>
              <SiteHeader />
              <NetworkNotice />
              <main id="main" className="mx-auto w-full max-w-page flex-1 px-4 py-8 sm:px-6">
                {children}
              </main>
              <SiteFooter />
            </div>
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
