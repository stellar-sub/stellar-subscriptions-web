"use client";

import Link from "next/link";

const FREIGHTER_URL = "https://freighter.app";
const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk";
const FIREFOX_STORE_URL = "https://addons.mozilla.org/en-US/firefox/addon/freighter/";

export function getFreighterInstallUrl(userAgent: string): string {
  if (/firefox/i.test(userAgent)) {
    return FIREFOX_STORE_URL;
  }
  if (/chrome|chromium|crios|edg|brave|opr/i.test(userAgent)) {
    return CHROME_STORE_URL;
  }
  return FREIGHTER_URL;
}

export default function OnboardingPage() {
  const installUrl =
    typeof navigator !== "undefined"
      ? getFreighterInstallUrl(navigator.userAgent)
      : FREIGHTER_URL;

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">What is a Wallet?</h1>
        <p className="text-lg text-muted">
          A crypto wallet is like a digital account for managing your assets on blockchain networks.
          It stores your private keys (passwords) and helps you send and receive money securely.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Freighter</h2>
        <p className="text-muted">
          Freighter is a browser extension that makes it safe to interact with Stellar apps.
          It keeps your private keys secure in your browser, not on our servers.
        </p>
        <a href={installUrl} target="_blank" rel="noreferrer" className="btn-primary inline-block">
          Install Freighter
        </a>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">What This App Does</h2>
        <ul className="space-y-2 text-muted">
          <li>✓ Lets you subscribe to recurring payments</li>
          <li>✓ Manages your subscription plans and billing</li>
          <li>✓ Shows transaction history</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">What This App Does NOT Do</h2>
        <ul className="space-y-2 text-muted">
          <li>✗ Store or access your private keys</li>
          <li>✗ Move money without your approval in Freighter</li>
          <li>✗ Hold or freeze your funds</li>
          <li>✗ See your account without you signing in</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Getting Started</h2>
        <ol className="space-y-2 text-muted">
          <li>1. Install the Freighter extension</li>
          <li>2. Create or import an account</li>
          <li>3. Come back and click "Connect wallet"</li>
          <li>4. Approve the connection in Freighter</li>
        </ol>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Networks</h2>
        <p className="text-muted">
          You can use this app on <strong>Testnet</strong> (for testing with free play money) or
          <strong> Mainnet</strong> (with real XLM). Make sure Freighter is set to the same network you want to use.
        </p>
      </div>

      <div className="flex gap-4">
        <Link href="/" className="btn-secondary">
          Back
        </Link>
      </div>
    </main>
  );
}
