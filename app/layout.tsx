import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { NetworkNotice } from "@/components/layout/NetworkNotice";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
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

/** Applies a saved light-theme choice before first paint, so dark never flashes. */
const THEME_SCRIPT = `try{if(localStorage.getItem("subs.theme")==="light")document.documentElement.classList.remove("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <WalletProvider>
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
        </WalletProvider>
      </body>
    </html>
  );
}
